# Vocabulary Builder App Migration Guide for Claude Pro (FINAL VERSION)


## Project Context
- **Existing**: HTML/CSS/JS + Google Sheets at underthetreefoundation.in (3 levels preserved)
- **Target Stack**: React 18 + Tailwind CSS + Framer Motion + JSON data
- **Users**: 
  - CBSE/State Board Classes 5-12 (weak English foundation)
  - Competitive exams: SSC, UPSC, Banking, NEET, JEE, CLAT
- **Word Count Targets**:
  - Beginners (Class 5-8): 1500 words
  - Intermediate (Class 9-10): 2500 words  
  - Advanced (Class 11-12 + Competitive): 5000 words
- **Deployment**: Vercel free tier
- **Complement**: Pairs with existing Grammar app (6 formats matched)

## Initial Setup Prompt
"Convert my existing 3-level HTML/JS app to Vite React + Tailwind + Framer Motion with this JSON structure:

```json
{
  "levels": {
    "beginners": {
      "target": "Class 5-8 CBSE/State Board", 
      "word_count": 2000,
      "quiz_formats": ["picture_matching", "word_hindi", "audio_word"],
      "words": [{"word": "apple", "hindi": "सेब", "meaning": "फल", "image": "apple.jpg"}]
    },
    "intermediate": {
      "target": "Class 9-10", 
      "word_count": 3
      500,
      "quiz_formats": ["synonyms_4opt", "antonyms", "fill_blanks"],
      "words": [{"word": "ambiguous", "hindi": "द्वि-अर्थी", "synonyms": ["unclear"]}]
    },
    "advanced": {
      "target": "Class 11-12 + SSC/UPSC/Banking",
      "word_count": 5000,
      "quiz_formats": ["one_word_sub", "idioms", "word_analogy", "cloze_test"],
      "words": [{"word": "ameliorate", "hindi": "सुधारना", "exam_category": "SSC"}]
    }
  }
}
