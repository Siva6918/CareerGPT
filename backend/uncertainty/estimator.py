"""
CareerGPT — Uncertainty-Aware Multimodal Competency Estimator (Module 2)

Fuses evidence from:
- TEXT: answer relevance, correctness, depth, reasoning, completeness
- SPEECH: duration, rate, pauses, filler words, hesitation
- VISION: face detection, observable behaviour (auxiliary only)

IMPORTANT:
- Vision evidence is AUXILIARY only
- Text/technical answer has stronger weight for technical skills
- The system is transparent about what evidence is used
"""
import logging
import re
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import json

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# TEXT ANALYSIS
# ─────────────────────────────────────────────────────────────

@dataclass
class TextAnalysisResult:
    """Result of analyzing a text answer."""
    raw_answer: str
    word_count: int
    relevance_score: float     # 0-1: how relevant to question
    correctness_score: float   # 0-1: technical accuracy
    depth_score: float         # 0-1: technical depth
    reasoning_score: float     # 0-1: logical reasoning quality
    completeness_score: float  # 0-1: all aspects covered
    fused_text_score: float    # final 0-1 weighted text score
    key_concepts_found: List[str] = field(default_factory=list)
    missing_concepts: List[str] = field(default_factory=list)
    follow_up_needed: bool = False
    evaluation_details: Dict = field(default_factory=dict)


class TextAnalyzer:
    """Analyzes text answers for technical competency signals."""

    # Weight vector for fusing text components
    TEXT_WEIGHTS = {
        "correctness": 0.35,
        "depth": 0.25,
        "relevance": 0.20,
        "reasoning": 0.12,
        "completeness": 0.08
    }

    async def analyze(
        self,
        question_text: str,
        answer_text: str,
        expected_concepts: List[str],
        evaluation_rubric: Dict,
        llm_provider=None
    ) -> TextAnalysisResult:
        """
        Analyze a text answer using LLM + deterministic signals.
        Falls back to heuristic analysis if LLM unavailable.
        """
        word_count = len(answer_text.split()) if answer_text else 0

        if not answer_text or word_count < 3:
            return TextAnalysisResult(
                raw_answer=answer_text or "",
                word_count=word_count,
                relevance_score=0.0,
                correctness_score=0.0,
                depth_score=0.0,
                reasoning_score=0.0,
                completeness_score=0.0,
                fused_text_score=0.0,
                follow_up_needed=True,
                evaluation_details={"reason": "Answer too short or empty"}
            )

        # Try LLM-based evaluation
        if llm_provider:
            try:
                return await self._llm_evaluate(
                    question_text, answer_text, expected_concepts,
                    evaluation_rubric, llm_provider
                )
            except Exception as e:
                logger.warning(f"LLM evaluation failed, using heuristic: {e}")

        # Heuristic fallback
        return self._heuristic_evaluate(question_text, answer_text, expected_concepts)

    async def _llm_evaluate(
        self,
        question: str,
        answer: str,
        expected_concepts: List[str],
        rubric: Dict,
        llm_provider
    ) -> TextAnalysisResult:
        """Use LLM to evaluate answer quality."""
        concepts_str = ", ".join(expected_concepts) if expected_concepts else "general technical concepts"

        system_prompt = """You are a technical interview evaluator for B.Tech students.
Evaluate the answer strictly and return valid JSON only.
Do NOT fabricate scores — base them purely on what is written in the answer.
If the answer is vague or incorrect, score accordingly."""

        user_prompt = f"""
Question: {question}

Expected concepts: {concepts_str}

Candidate's answer: {answer}

Evaluate and return ONLY this JSON:
{{
  "relevance_score": <0.0-1.0>,
  "correctness_score": <0.0-1.0>,
  "depth_score": <0.0-1.0>,
  "reasoning_score": <0.0-1.0>,
  "completeness_score": <0.0-1.0>,
  "key_concepts_found": ["concept1", "concept2"],
  "missing_concepts": ["missing1"],
  "follow_up_needed": <true/false>,
  "brief_feedback": "one sentence"
}}
"""
        response = await llm_provider.complete(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            max_tokens=500
        )

        # Parse JSON from response
        try:
            # Extract JSON from response
            content = response.content if hasattr(response, 'content') else str(response)
            # Find JSON block
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                data = json.loads(content)

            scores = {
                "correctness": float(data.get("correctness_score", 0.5)),
                "depth": float(data.get("depth_score", 0.5)),
                "relevance": float(data.get("relevance_score", 0.5)),
                "reasoning": float(data.get("reasoning_score", 0.5)),
                "completeness": float(data.get("completeness_score", 0.5)),
            }
            fused = self._fuse_text_scores(scores)

            return TextAnalysisResult(
                raw_answer=answer,
                word_count=len(answer.split()),
                relevance_score=scores["relevance"],
                correctness_score=scores["correctness"],
                depth_score=scores["depth"],
                reasoning_score=scores["reasoning"],
                completeness_score=scores["completeness"],
                fused_text_score=fused,
                key_concepts_found=data.get("key_concepts_found", []),
                missing_concepts=data.get("missing_concepts", []),
                follow_up_needed=data.get("follow_up_needed", False),
                evaluation_details=data
            )
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"LLM response parse failed: {e}, using heuristic")
            return self._heuristic_evaluate(question, answer, expected_concepts)

    def _heuristic_evaluate(
        self,
        question: str,
        answer: str,
        expected_concepts: List[str]
    ) -> TextAnalysisResult:
        """Deterministic heuristic evaluation when LLM unavailable."""
        word_count = len(answer.split())
        answer_lower = answer.lower()

        # Concept detection
        concepts_found = [c for c in expected_concepts if c.lower() in answer_lower]
        concepts_missing = [c for c in expected_concepts if c.lower() not in answer_lower]

        concept_coverage = len(concepts_found) / max(len(expected_concepts), 1)

        # Basic scoring signals
        relevance = min(1.0, concept_coverage + 0.2)  # base relevance

        # Length heuristic (rough depth proxy)
        if word_count < 20:
            depth = 0.2
        elif word_count < 50:
            depth = 0.4
        elif word_count < 100:
            depth = 0.6
        elif word_count < 200:
            depth = 0.75
        else:
            depth = 0.85

        # Technical terms density
        tech_terms = [
            "interface", "class", "method", "function", "algorithm", "complexity",
            "database", "api", "http", "rest", "framework", "library", "design",
            "pattern", "thread", "memory", "stack", "heap", "hash", "tree"
        ]
        tech_count = sum(1 for t in tech_terms if t in answer_lower)
        tech_density = min(1.0, tech_count / 5.0)

        correctness = (concept_coverage * 0.6 + tech_density * 0.4)
        reasoning = min(1.0, (word_count / 100.0) * 0.5 + concept_coverage * 0.5)
        completeness = concept_coverage

        scores = {
            "correctness": round(correctness, 3),
            "depth": round(depth, 3),
            "relevance": round(relevance, 3),
            "reasoning": round(reasoning, 3),
            "completeness": round(completeness, 3),
        }

        return TextAnalysisResult(
            raw_answer=answer,
            word_count=word_count,
            relevance_score=scores["relevance"],
            correctness_score=scores["correctness"],
            depth_score=scores["depth"],
            reasoning_score=scores["reasoning"],
            completeness_score=scores["completeness"],
            fused_text_score=self._fuse_text_scores(scores),
            key_concepts_found=concepts_found,
            missing_concepts=concepts_missing,
            follow_up_needed=concept_coverage < 0.5,
            evaluation_details={"method": "heuristic", "scores": scores}
        )

    def _fuse_text_scores(self, scores: Dict[str, float]) -> float:
        """Weighted fusion of text component scores."""
        total = sum(
            scores.get(k, 0.0) * w
            for k, w in self.TEXT_WEIGHTS.items()
        )
        return round(min(1.0, max(0.0, total)), 3)


# ─────────────────────────────────────────────────────────────
# SPEECH ANALYSIS
# ─────────────────────────────────────────────────────────────

@dataclass
class SpeechAnalysisResult:
    """Result of analyzing speech features."""
    transcript: str
    duration_seconds: float
    word_count: int
    speaking_rate_wpm: float    # words per minute
    pause_count: int
    filler_word_count: int      # um, uh, like, you know
    filler_ratio: float         # filler words / total words
    speech_confidence_score: float  # 0-1 (inverse of hesitation signals)
    features: Dict = field(default_factory=dict)


class SpeechAnalyzer:
    """Analyzes speech features for auxiliary competency signals."""

    FILLER_WORDS = {
        "um", "uh", "er", "ah", "like", "you know", "basically",
        "literally", "actually", "sort of", "kind of", "i mean"
    }

    async def analyze(
        self,
        audio_path: Optional[str] = None,
        transcript: Optional[str] = None,
        duration_seconds: float = 0.0
    ) -> Optional[SpeechAnalysisResult]:
        """
        Analyze speech. Returns None if audio unavailable.
        Falls back to transcript-only analysis if audio not available.
        """
        if not transcript and not audio_path:
            return None

        if audio_path and not transcript:
            transcript = await self._transcribe(audio_path)
            if not transcript:
                return None

        return self._analyze_transcript(transcript, duration_seconds)

    async def _transcribe(self, audio_path: str) -> Optional[str]:
        """Transcribe audio using Whisper (if available)."""
        try:
            import whisper
            model = whisper.load_model("base")
            result = model.transcribe(audio_path)
            return result.get("text", "")
        except ImportError:
            logger.warning("Whisper not available, skipping speech transcription")
            return None
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None

    def _analyze_transcript(self, transcript: str, duration: float) -> SpeechAnalysisResult:
        """Extract features from transcript text."""
        words = transcript.split()
        word_count = len(words)
        transcript_lower = transcript.lower()

        # Speaking rate
        if duration > 0 and word_count > 0:
            wpm = (word_count / duration) * 60
        else:
            wpm = 0.0

        # Filler words
        filler_count = 0
        for filler in self.FILLER_WORDS:
            filler_count += transcript_lower.count(filler)

        filler_ratio = filler_count / max(word_count, 1)

        # Pause estimation (heuristic from punctuation)
        pause_count = transcript.count("...") + transcript.count(",")

        # Speech confidence score
        # High filler ratio and low speaking rate → lower confidence signal
        # This is an auxiliary signal only — not deterministic of technical skill
        if wpm == 0:
            confidence_proxy = 0.5  # unknown
        else:
            rate_score = 1.0 if 100 <= wpm <= 160 else max(0.3, 1 - abs(wpm - 130) / 130)
            filler_penalty = min(0.5, filler_ratio * 3)
            confidence_proxy = max(0.0, rate_score - filler_penalty)

        return SpeechAnalysisResult(
            transcript=transcript,
            duration_seconds=duration,
            word_count=word_count,
            speaking_rate_wpm=round(wpm, 1),
            pause_count=pause_count,
            filler_word_count=filler_count,
            filler_ratio=round(filler_ratio, 3),
            speech_confidence_score=round(confidence_proxy, 3),
            features={
                "speaking_rate_normal": 100 <= wpm <= 160,
                "high_filler_ratio": filler_ratio > 0.1,
                "estimated_pauses": pause_count
            }
        )


# ─────────────────────────────────────────────────────────────
# VISION ANALYSIS (Auxiliary)
# ─────────────────────────────────────────────────────────────

@dataclass
class VisionAnalysisResult:
    """Result of optional vision analysis. AUXILIARY ONLY."""
    face_detected: bool
    engagement_score: float      # 0-1 observable engagement proxy
    frames_analyzed: int
    note: str = "Vision features are auxiliary evidence only and do not directly measure technical competency"
    features: Dict = field(default_factory=dict)


class VisionAnalyzer:
    """
    Optional webcam-based analysis.
    CRITICAL: Vision is AUXILIARY evidence only.
    Does NOT claim to measure technical competency directly.
    """

    async def analyze(
        self,
        frame_paths: Optional[List[str]] = None,
        video_path: Optional[str] = None
    ) -> Optional[VisionAnalysisResult]:
        """Analyze video frames if available."""
        if not frame_paths and not video_path:
            return None

        try:
            import cv2
            import numpy as np

            if video_path and not frame_paths:
                frame_paths = await self._extract_frames(video_path)

            if not frame_paths:
                return None

            return await self._analyze_frames(frame_paths)

        except ImportError:
            logger.warning("OpenCV not available, skipping vision analysis")
            return None
        except Exception as e:
            logger.error(f"Vision analysis error: {e}")
            return None

    async def _extract_frames(self, video_path: str, sample_rate: int = 30) -> List[str]:
        """Extract frames from video."""
        import cv2
        import tempfile
        import os
        frames = []
        cap = cv2.VideoCapture(video_path)
        frame_count = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_count % sample_rate == 0:
                tmp = tempfile.mktemp(suffix=".jpg")
                cv2.imwrite(tmp, frame)
                frames.append(tmp)
            frame_count += 1
        cap.release()
        return frames[:10]  # max 10 frames

    async def _analyze_frames(self, frame_paths: List[str]) -> VisionAnalysisResult:
        """Analyze frames for observable engagement signals."""
        import cv2

        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        faces_detected = 0
        for path in frame_paths:
            img = cv2.imread(path)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            if len(faces) > 0:
                faces_detected += 1

        face_ratio = faces_detected / max(len(frame_paths), 1)

        # Engagement proxy: was face visible and centered?
        # This is a very rough proxy — not facial expression analysis
        engagement = round(face_ratio * 0.7 + 0.3, 3)  # base 0.3 always

        return VisionAnalysisResult(
            face_detected=faces_detected > 0,
            engagement_score=engagement,
            frames_analyzed=len(frame_paths),
            features={
                "face_visible_ratio": round(face_ratio, 3),
                "frames_with_face": faces_detected,
                "total_frames": len(frame_paths)
            }
        )


# ─────────────────────────────────────────────────────────────
# MULTIMODAL FUSION (Module 2 Core)
# ─────────────────────────────────────────────────────────────

@dataclass
class FusedEvidenceResult:
    """
    Final fused evidence result from all modalities.
    
    TRANSPARENCY: shows exactly how evidence was combined.
    """
    # Component scores
    text_score: Optional[float]
    speech_score: Optional[float]
    vision_score: Optional[float]

    # Component weights used (configurable)
    weights: Dict[str, float]

    # Final fused score
    fused_score: float
    reliability: float           # how reliable is this overall evidence

    # Evidence coverage
    modalities_used: List[str]
    evidence_quality: str        # "strong" | "moderate" | "weak"

    # Transparency fields
    fusion_method: str = "weighted_reliability"
    notes: List[str] = field(default_factory=list)


class MultimodalFusion:
    """
    Module 2: Uncertainty-Aware Multimodal Competency Estimator

    Fuses text, speech, and vision evidence.
    Weights are configurable and transparent.
    Vision is always weighted less than text for technical skills.
    """

    # Default weights — text dominates for technical assessment
    DEFAULT_WEIGHTS = {
        "text": 0.70,
        "speech": 0.20,
        "vision": 0.10   # auxiliary only
    }

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or self.DEFAULT_WEIGHTS
        # Normalize weights
        total = sum(self.weights.values())
        self.weights = {k: v / total for k, v in self.weights.items()}

    def fuse(
        self,
        text_result: Optional[TextAnalysisResult],
        speech_result: Optional[SpeechAnalysisResult],
        vision_result: Optional[VisionAnalysisResult]
    ) -> FusedEvidenceResult:
        """
        Fuse multimodal evidence into a single evidence score.
        Only uses channels that have actual evidence.
        """
        available: Dict[str, float] = {}
        reliability_sum = 0.0
        notes = []

        # Text (primary)
        if text_result:
            available["text"] = text_result.fused_text_score
            reliability_sum += 0.9  # text evidence is highly reliable
        else:
            notes.append("No text evidence — text channel unavailable")

        # Speech (secondary)
        if speech_result and speech_result.word_count > 5:
            available["speech"] = speech_result.speech_confidence_score
            reliability_sum += 0.6
            notes.append(f"Speech features extracted: {speech_result.word_count} words")
        else:
            notes.append("Speech channel not available or insufficient")

        # Vision (auxiliary)
        if vision_result:
            available["vision"] = vision_result.engagement_score
            reliability_sum += 0.3  # lower reliability for vision
            notes.append("Vision analysis included as auxiliary evidence")
            notes.append(vision_result.note)
        else:
            notes.append("Vision channel not available")

        if not available:
            return FusedEvidenceResult(
                text_score=None,
                speech_score=None,
                vision_score=None,
                weights=self.weights,
                fused_score=0.0,
                reliability=0.0,
                modalities_used=[],
                evidence_quality="insufficient",
                notes=["No evidence available from any channel"]
            )

        # Compute weighted fusion with only available channels
        available_weight_sum = sum(
            self.weights.get(ch, 0.0) for ch in available
        )

        if available_weight_sum == 0:
            fused = sum(available.values()) / len(available)
        else:
            fused = sum(
                score * self.weights.get(ch, 0.0) / available_weight_sum
                for ch, score in available.items()
            )

        reliability = reliability_sum / (len(available) * 0.9)  # normalize
        reliability = min(1.0, reliability)

        if fused >= 0.7:
            quality = "strong"
        elif fused >= 0.4:
            quality = "moderate"
        else:
            quality = "weak"

        return FusedEvidenceResult(
            text_score=text_result.fused_text_score if text_result else None,
            speech_score=speech_result.speech_confidence_score if speech_result else None,
            vision_score=vision_result.engagement_score if vision_result else None,
            weights=self.weights,
            fused_score=round(fused, 3),
            reliability=round(reliability, 3),
            modalities_used=list(available.keys()),
            evidence_quality=quality,
            notes=notes
        )


# ─────────────────────────────────────────────────────────────
# COMPETENCY ESTIMATOR (top-level orchestrator for Module 2)
# ─────────────────────────────────────────────────────────────

class CompetencyEstimator:
    """
    Top-level estimator: coordinates text, speech, vision analysis
    and returns fused evidence for graph update.
    """

    def __init__(self, fusion_weights: Optional[Dict] = None):
        self.text_analyzer = TextAnalyzer()
        self.speech_analyzer = SpeechAnalyzer()
        self.vision_analyzer = VisionAnalyzer()
        self.fusion = MultimodalFusion(fusion_weights)

    async def estimate(
        self,
        question_text: str,
        answer_text: str,
        expected_concepts: List[str],
        evaluation_rubric: Dict,
        audio_path: Optional[str] = None,
        audio_duration: float = 0.0,
        frame_paths: Optional[List[str]] = None,
        llm_provider=None
    ) -> Dict[str, Any]:
        """
        Run full multimodal estimation.
        Returns structured evidence for competency graph update.
        """
        # Text analysis
        text_result = await self.text_analyzer.analyze(
            question_text, answer_text, expected_concepts,
            evaluation_rubric, llm_provider
        )

        # Speech analysis (optional)
        speech_result = None
        if audio_path or (answer_text and audio_duration > 0):
            speech_result = await self.speech_analyzer.analyze(
                audio_path=audio_path,
                transcript=answer_text,
                duration_seconds=audio_duration
            )

        # Vision analysis (optional, auxiliary)
        vision_result = None
        if frame_paths:
            vision_result = await self.vision_analyzer.analyze(frame_paths=frame_paths)

        # Fuse all evidence
        fused = self.fusion.fuse(text_result, speech_result, vision_result)

        return {
            "text_analysis": {
                "fused_score": text_result.fused_text_score,
                "relevance": text_result.relevance_score,
                "correctness": text_result.correctness_score,
                "depth": text_result.depth_score,
                "concepts_found": text_result.key_concepts_found,
                "missing_concepts": text_result.missing_concepts,
                "follow_up_needed": text_result.follow_up_needed,
                "word_count": text_result.word_count
            } if text_result else None,
            "speech_analysis": {
                "confidence_score": speech_result.speech_confidence_score,
                "wpm": speech_result.speaking_rate_wpm,
                "filler_ratio": speech_result.filler_ratio,
                "word_count": speech_result.word_count
            } if speech_result else None,
            "vision_analysis": {
                "face_detected": vision_result.face_detected,
                "engagement_score": vision_result.engagement_score,
                "note": vision_result.note
            } if vision_result else None,
            "fused_evidence": {
                "fused_score": fused.fused_score,
                "reliability": fused.reliability,
                "evidence_quality": fused.evidence_quality,
                "modalities_used": fused.modalities_used,
                "weights_used": fused.weights,
                "notes": fused.notes
            }
        }
