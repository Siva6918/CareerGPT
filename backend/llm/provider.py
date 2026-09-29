"""
CareerGPT - LLM Provider Abstraction Layer

Supports: OpenAI | Gemini | Mock (demo)
Provider is configured via LLM_PROVIDER env var.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
import logging
import json
import random

logger = logging.getLogger(__name__)


class LLMMessage:
    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content


class LLMResponse:
    def __init__(self, content: str, provider: str, model: str, tokens_used: int = 0):
        self.content = content
        self.provider = provider
        self.model = model
        self.tokens_used = tokens_used


class BaseLLMProvider(ABC):
    """Abstract base for all LLM providers."""

    @abstractmethod
    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> LLMResponse:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass


# ─────────────────────────────────────────────────────────────
# MOCK PROVIDER — always works, used for demo/testing
# ─────────────────────────────────────────────────────────────

class MockLLMProvider(BaseLLMProvider):
    """Deterministic mock responses for demo mode and testing."""

    QUESTION_TEMPLATES = {
        "java": [
            "Explain the difference between an interface and an abstract class in Java. When would you use each?",
            "What is the Java memory model? Describe heap vs stack allocation.",
            "How does Java handle multiple inheritance? What is the diamond problem?",
            "Explain generics in Java and their benefits.",
            "What are Java 8 streams and how do they improve code readability?"
        ],
        "python": [
            "What is the difference between a list and a tuple in Python?",
            "Explain Python's GIL (Global Interpreter Lock) and its implications.",
            "How does Python's garbage collection work?",
            "What are decorators in Python? Give a practical example.",
            "Explain list comprehensions vs generator expressions."
        ],
        "spring_boot": [
            "What is Spring Boot and how does it differ from the Spring Framework?",
            "Explain dependency injection in Spring Boot.",
            "How does Spring Boot auto-configuration work?",
            "What is the role of @RestController vs @Controller?",
            "How do you configure a data source in Spring Boot?"
        ],
        "postgresql": [
            "Explain the difference between INNER JOIN and LEFT JOIN.",
            "What are database indexes and when should you use them?",
            "Explain ACID properties in databases.",
            "What is database normalization and why is it important?",
            "How do transactions work in PostgreSQL?"
        ],
        "data_structures": [
            "Explain the time complexity of common operations on a HashMap.",
            "What is the difference between BFS and DFS?",
            "When would you use a heap data structure?",
            "Explain the concept of dynamic programming with an example.",
            "What is a balanced binary search tree and why is it useful?"
        ],
        "rest_api": [
            "What are RESTful API design principles?",
            "Explain HTTP methods: GET, POST, PUT, PATCH, DELETE.",
            "What is the difference between authentication and authorization?",
            "How does JWT token authentication work?",
            "What are HTTP status codes and when should you use 400 vs 422?"
        ],
        "default": [
            "Tell me about a challenging technical project you worked on.",
            "How do you approach debugging a complex issue in your code?",
            "Explain how you would design a simple RESTful API for a task management system.",
            "What is version control and how does Git help in team collaboration?",
            "Describe your approach to writing clean, maintainable code."
        ]
    }

    EVALUATION_TEMPLATES = {
        "strong": {
            "score": 0.85,
            "correctness": "Answer demonstrates strong understanding of the concept",
            "depth": "Provided detailed technical explanation with nuance",
            "reasoning": "Clear logical flow and accurate technical terminology",
            "completeness": "Covered all key aspects of the question"
        },
        "developing": {
            "score": 0.6,
            "correctness": "Answer shows basic understanding but lacks depth",
            "depth": "Covered main points but missed some important details",
            "reasoning": "Generally correct but some imprecision in terminology",
            "completeness": "Partially answered; some aspects not addressed"
        },
        "emerging": {
            "score": 0.35,
            "correctness": "Partial understanding demonstrated",
            "depth": "Surface-level answer without technical depth",
            "reasoning": "Some misconceptions present",
            "completeness": "Key concepts missing from the answer"
        }
    }

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> LLMResponse:
        """Generate mock response based on message content."""
        last_message = messages[-1]["content"] if messages else ""

        if "generate_question" in last_message.lower() or "question" in last_message.lower():
            response = self._generate_mock_question(last_message, kwargs.get("skill", "default"))
        elif "evaluate" in last_message.lower() or "analyze answer" in last_message.lower():
            response = self._generate_mock_evaluation()
        elif "roadmap" in last_message.lower():
            response = self._generate_mock_roadmap_explanation()
        elif "extract" in last_message.lower() and "skill" in last_message.lower():
            response = self._generate_mock_skill_extraction()
        elif "recommend" in last_message.lower() and "project" in last_message.lower():
            response = self._generate_mock_project_recommendation()
        else:
            response = "I'm here to help with your career preparation. This is a demo response - configure your LLM API key for full AI capabilities."

        return LLMResponse(
            content=response,
            provider="mock",
            model="mock-v1",
            tokens_used=len(response.split())
        )

    def _generate_mock_question(self, context: str, skill: str = "default") -> str:
        skill_lower = skill.lower().replace(" ", "_").replace(".", "_")
        questions = self.QUESTION_TEMPLATES.get(skill_lower, self.QUESTION_TEMPLATES["default"])
        return random.choice(questions)

    def _generate_mock_evaluation(self) -> str:
        level = random.choice(["strong", "developing", "emerging"])
        template = self.EVALUATION_TEMPLATES[level]
        return json.dumps({
            "evaluation_level": level,
            "score": template["score"],
            "correctness": template["correctness"],
            "depth": template["depth"],
            "reasoning": template["reasoning"],
            "completeness": template["completeness"],
            "key_concepts_demonstrated": ["concept_a", "concept_b"],
            "missing_concepts": ["advanced_topic"],
            "follow_up_needed": level != "strong"
        })

    def _generate_mock_roadmap_explanation(self) -> str:
        return json.dumps({
            "explanation": "Based on your current competency profile, this roadmap prioritizes the skills with the highest gap relative to your target role.",
            "stage": "foundation",
            "rationale": "Starting with fundamentals ensures prerequisite knowledge is in place before advancing to specialized topics."
        })

    def _generate_mock_skill_extraction(self) -> str:
        return json.dumps({
            "skills": [
                {"name": "Python", "confidence": 0.9, "context": "Proficient in Python"},
                {"name": "Machine Learning", "confidence": 0.7, "context": "Applied ML techniques"},
                {"name": "SQL", "confidence": 0.8, "context": "Database management"}
            ]
        })

    def _generate_mock_project_recommendation(self) -> str:
        return json.dumps({
            "title": "Full-Stack REST API with Authentication",
            "description": "Build a production-ready REST API using your target stack",
            "skills_covered": ["REST API", "Authentication", "Database Design"],
            "estimated_hours": 40,
            "why_recommended": "Directly addresses your top skill gaps in backend development"
        })

    async def health_check(self) -> bool:
        return True


# ─────────────────────────────────────────────────────────────
# OPENAI PROVIDER
# ─────────────────────────────────────────────────────────────

class OpenAIProvider(BaseLLMProvider):
    """OpenAI GPT provider."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=self.api_key)
            except ImportError:
                raise RuntimeError("openai package not installed. Run: pip install openai")
        return self._client

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> LLMResponse:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return LLMResponse(
                content=response.choices[0].message.content,
                provider="openai",
                model=self.model,
                tokens_used=response.usage.total_tokens if response.usage else 0
            )
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            from config import settings
            if not settings.demo_mode:
                raise RuntimeError(f"OpenAI service unavailable: {e}")
            # Fallback to mock only in explicit demo mode
            mock = MockLLMProvider()
            return await mock.complete(messages, temperature, max_tokens, **kwargs)

    async def health_check(self) -> bool:
        try:
            response = await self.client.models.list()
            return len(response.data) > 0
        except Exception:
            return False


# ─────────────────────────────────────────────────────────────
# GEMINI PROVIDER
# ─────────────────────────────────────────────────────────────

class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider."""

    def __init__(self, api_key: str, model: str = "gemini-3.8-flash"):
        self.api_key = api_key
        self.model = model
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._client = genai.GenerativeModel(self.model)
            except ImportError:
                raise RuntimeError("google-generativeai not installed")
        return self._client

    async def complete(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs
    ) -> LLMResponse:
        import asyncio
        import re

        prompt = "\n".join(
            f"{m['role'].upper()}: {m['content']}"
            for m in messages
        )

        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                response = await asyncio.to_thread(
                    self.client.generate_content,
                    prompt,
                    generation_config={"temperature": temperature, "max_output_tokens": max_tokens}
                )
                return LLMResponse(
                    content=response.text,
                    provider="gemini",
                    model=self.model,
                    tokens_used=0
                )
            except Exception as e:
                last_error = e
                err_str = str(e)
                if "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower():
                    logger.warning(f"Gemini free tier rate limit encountered (attempt {attempt + 1}/{max_retries}).")
                    # Try to extract retry delay from error message if available
                    delay_match = re.search(r"retry in (\d+(?:\.\d+)?)s", err_str, re.IGNORECASE)
                    wait_sec = float(delay_match.group(1)) if delay_match else (2 ** attempt * 5)
                    # Cap sleep to at most 10 seconds per attempt to avoid blocking indefinitely
                    sleep_time = min(wait_sec, 8.0)
                    if attempt < max_retries - 1:
                        await asyncio.sleep(sleep_time)
                        continue
                else:
                    break

        logger.error(f"Gemini API failure after retries: {last_error}")
        from config import settings
        if not settings.demo_mode:
            clean_msg = "AI Provider quota exceeded or temporarily unavailable. Please retry in a few moments." if "429" in str(last_error) else str(last_error)
            raise RuntimeError(f"Gemini service unavailable: {clean_msg}")
        mock = MockLLMProvider()
        return await mock.complete(messages, temperature, max_tokens, **kwargs)

    async def health_check(self) -> bool:
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            models = genai.list_models()
            return True
        except Exception:
            return False


# ─────────────────────────────────────────────────────────────
# FACTORY
# ─────────────────────────────────────────────────────────────

def create_llm_provider() -> BaseLLMProvider:
    """Factory: creates LLM provider based on environment config."""
    from config import settings

    provider_name = settings.llm_provider.lower()

    if provider_name == "openai" and settings.openai_api_key:
        logger.info(f"Using OpenAI LLM provider (model={settings.openai_model})")
        return OpenAIProvider(api_key=settings.openai_api_key, model=settings.openai_model)

    elif provider_name == "gemini" and settings.gemini_api_key:
        logger.info(f"Using Gemini LLM provider (model={settings.gemini_model})")
        return GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)

    else:
        if not settings.demo_mode:
            raise RuntimeError(
                f"LLM provider '{provider_name}' configured but required API key is missing in production environment."
            )
        logger.info("Using Mock LLM provider (demo mode)")
        return MockLLMProvider()


# Singleton provider instance
_provider: Optional[BaseLLMProvider] = None


def get_llm_provider() -> BaseLLMProvider:
    global _provider
    if _provider is None:
        _provider = create_llm_provider()
    return _provider


async def llm_complete(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1000,
    **kwargs
) -> str:
    """Convenience wrapper - returns content string directly."""
    import time
    start_time = time.time()
    
    provider = get_llm_provider()
    try:
        response = await provider.complete(messages, temperature, max_tokens, **kwargs)
        duration_ms = int((time.time() - start_time) * 1000)
        
        logger.info(
            f"LLM Operation: {kwargs.get('operation', 'completion')} | "
            f"Provider: {response.provider} | Model: {response.model} | "
            f"Tokens: {response.tokens_used} | Duration: {duration_ms}ms"
        )
        return response.content
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error(
            f"LLM Error: {kwargs.get('operation', 'completion')} | "
            f"Duration: {duration_ms}ms | Error: {str(e)}"
        )
        raise
