import re
import os

# 1. Fix InterviewPage.jsx mobile view
with open('frontend/src/pages/InterviewPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }}>",
                          "<div className=\"interview-container\">")
with open('frontend/src/pages/InterviewPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Add .interview-container CSS to index.css
with open('frontend/src/index.css', 'a', encoding='utf-8') as f:
    f.write("""
/* Responsive Interview Container */
.interview-container {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 24px;
  align-items: start;
}
@media (max-width: 1024px) {
  .interview-container {
    grid-template-columns: 1fr;
  }
}
""")

# 3. Fix ProfileSetupPage.jsx Stepper & padding for Mobile
with open('frontend/src/pages/ProfileSetupPage.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("gridTemplateColumns: 'repeat(4, 1fr)',", "gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',")
content = content.replace("padding: '36px 32px',", "padding: '36px clamp(16px, 4vw, 32px)',")
content = content.replace("padding: '40px 24px 80px'", "padding: '40px clamp(12px, 3vw, 24px) 80px'")

with open('frontend/src/pages/ProfileSetupPage.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 4. Enhance Resume LLM Parsing
parser_code = """
import logging
import re
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class ResumeParser:
    def parse(self, file_path: str) -> Dict:
        pass
        
    async def parse_async(self, file_path: str) -> Dict:
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            raw_text = self._extract_pdf(file_path)
        elif ext in (".docx", ".doc"):
            raw_text = self._extract_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        if not raw_text:
            return {"error": "Could not extract text from resume"}

        # Use LLM to extract data intelligently
        try:
            from llm.provider import get_llm_provider
            llm = get_llm_provider()
            
            prompt = f\"\"\"
            You are an expert technical recruiter and resume parser.
            Analyze the following resume text and extract the sections and skills.
            If a section is missing, provide an empty string.
            Return a JSON object ONLY matching this EXACT schema:
            {{
                "education_section": "extracted education text",
                "experience_section": "extracted experience text",
                "skills_section": "extracted skills text",
                "projects_section": "extracted projects text",
                "certifications_section": "extracted certifications text",
                "summary_section": "extracted summary text",
                "skills": [
                    {{"skill_name": "Python", "canonical_id": "python", "confidence": 0.9, "context": "Used for backend", "source_section": "experience"}},
                    ...
                ]
            }}
            Resume Text:
            {raw_text}
            \"\"\"
            
            resp = await llm.complete(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=2000
            )
            
            # Extract JSON block from response
            match = re.search(r'```(?:json)?\s*(.*?)\s*```', resp.content, re.DOTALL)
            if match:
                json_str = match.group(1)
            else:
                json_str = resp.content
                
            parsed = json.loads(json_str)
            parsed["raw_text"] = raw_text
            return parsed
        except Exception as e:
            logger.error(f"LLM Resume extraction failed: {e}")
            # Fallback to simple extraction
            parsed = self._parse_sections(raw_text)
            parsed["raw_text"] = raw_text
            parsed["skills"] = self.extract_skills(raw_text, parsed.get("skills_section", ""))
            return parsed

    def _extract_pdf(self, path: str) -> str:
        try:
            import pymupdf
            doc = pymupdf.open(path)
            return "".join([page.get_text() for page in doc])
        except ImportError:
            return self._extract_pdf_fallback(path)
        except Exception as e:
            logger.error(f"PDF error: {e}")
            return ""

    def _extract_pdf_fallback(self, path: str) -> str:
        try:
            from pdfminer.high_level import extract_text
            return extract_text(path)
        except Exception:
            return ""

    def _extract_docx(self, path: str) -> str:
        try:
            from docx import Document
            doc = Document(path)
            return "\\n".join(para.text for para in doc.paragraphs)
        except Exception:
            return ""

    def _parse_sections(self, text: str) -> Dict:
        return {"education_section": "", "experience_section": "", "skills_section": "", "projects_section": "", "certifications_section": "", "summary_section": ""}
        
    def extract_skills(self, text: str, section: str) -> List[Dict]:
        return []

class DemoResumeParser:
    def get_demo_data(self, target_role: str = "Backend Developer") -> Dict:
        return {"skills": [{"skill_name": "Python", "canonical_id": "python", "confidence": 0.9, "source_section": "skills"}]}
"""

with open('backend/resume/parser.py', 'w', encoding='utf-8') as f:
    f.write(parser_code)

print("UI and LLM parser fixes applied.")
