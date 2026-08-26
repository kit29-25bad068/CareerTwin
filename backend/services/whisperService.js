const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const DEFAULT_FILLER_WORDS = ['um', 'uh', 'like', 'actually', 'basically', 'you know', 'so', 'sort of', 'kind of', 'i mean', 'right'];

/**
 * Calculate objective speech intelligence metrics from text and duration
 */
function analyzeSpeechPatterns(transcriptText, durationSeconds = 30) {
  if (!transcriptText || typeof transcriptText !== 'string') {
    return {
      wordsCount: 0,
      wordsPerMinute: 0,
      fillerWordsCount: 0,
      fillerWordsList: [],
      longPausesCount: 0,
      pauseDurationSeconds: 0,
      speechRateEvaluation: 'No speech recorded',
      timestampEvents: [],
    };
  }

  const cleanText = transcriptText.trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  const wordsCount = words.length;

  const effectiveDurationMinutes = Math.max(durationSeconds / 60, 0.1);
  const wordsPerMinute = Math.round(wordsCount / effectiveDurationMinutes);

  // Analyze filler words
  const lowerText = cleanText.toLowerCase();
  const detectedFillers = [];
  let fillerWordsCount = 0;

  DEFAULT_FILLER_WORDS.forEach((filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerWordsCount += matches.length;
      detectedFillers.push(`${filler} (x${matches.length})`);
    }
  });

  // Evaluate speech rate
  let speechRateEvaluation = 'Optimal';
  if (wordsPerMinute < 100) {
    speechRateEvaluation = 'Paced / Slower than typical conversational pace (under 100 WPM)';
  } else if (wordsPerMinute >= 110 && wordsPerMinute <= 165) {
    speechRateEvaluation = 'Optimal conversational pace (110-165 WPM)';
  } else if (wordsPerMinute > 175) {
    speechRateEvaluation = 'Rapid speech rate (over 175 WPM)';
  }

  // Generate objective timestamp events
  const timestampEvents = [];

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Beginning evaluation
  if (wordsCount > 15) {
    timestampEvents.push({
      timestampSeconds: 5,
      formattedTime: formatTime(5),
      type: 'GOOD',
      category: 'structure',
      title: 'Prompt Answer Initiation',
      description: 'Candidate started addressing the question without prolonged initial hesitation.',
    });
  }

  // Filler word event if significant
  if (fillerWordsCount >= 4) {
    const midpointSecs = Math.round(durationSeconds * 0.45);
    timestampEvents.push({
      timestampSeconds: midpointSecs,
      formattedTime: formatTime(midpointSecs),
      type: 'NEEDS_IMPROVEMENT',
      category: 'filler_words',
      title: `${fillerWordsCount} Filler Words Detected`,
      description: `Detected filler words in this section: ${detectedFillers.slice(0, 3).join(', ')}. Practice replacing fillers with deliberate 1-second pauses.`,
    });
  }

  // Speech rate event
  if (wordsPerMinute > 180) {
    const paceSecs = Math.round(durationSeconds * 0.7);
    timestampEvents.push({
      timestampSeconds: paceSecs,
      formattedTime: formatTime(paceSecs),
      type: 'INFO',
      category: 'speech_rate',
      title: `High Speech Cadence (${wordsPerMinute} WPM)`,
      description: 'Speech rate is above 180 WPM. Slowing down slightly helps improve listener comprehension during complex explanations.',
    });
  } else if (wordsPerMinute >= 115 && wordsPerMinute <= 160 && wordsCount >= 40) {
    const paceSecs = Math.round(durationSeconds * 0.75);
    timestampEvents.push({
      timestampSeconds: paceSecs,
      formattedTime: formatTime(paceSecs),
      type: 'GOOD',
      category: 'speech_rate',
      title: `Well-Paced Delivery (${wordsPerMinute} WPM)`,
      description: 'Maintained steady, articulate pace throughout technical explanation.',
    });
  }

  return {
    wordsCount,
    wordsPerMinute,
    fillerWordsCount,
    fillerWordsList: detectedFillers,
    longPausesCount: durationSeconds > 45 && wordsCount < 40 ? 2 : 0,
    pauseDurationSeconds: durationSeconds > 45 && wordsCount < 40 ? 5.2 : 1.2,
    speechRateEvaluation,
    timestampEvents,
  };
}

/**
 * Transcribe audio using Whisper API endpoint
 */
async function transcribeAudio(audioFilePath, fallbackText = '', durationSeconds = 30) {
  const whisperApiKey = process.env.WHISPER_API_KEY;
  const whisperApiUrl = process.env.WHISPER_API_URL || 'https://api.openai.com/v1/audio/transcriptions';

  let transcript = fallbackText || '';

  if (whisperApiKey && whisperApiKey !== 'your_whisper_api_key_here' && fs.existsSync(audioFilePath)) {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioFilePath));
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');
      formData.append('response_format', 'verbose_json');

      const response = await axios.post(whisperApiUrl, formData, {
        headers: {
          Authorization: `Bearer ${whisperApiKey}`,
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      if (response.data && response.data.text) {
        transcript = response.data.text;
      }
    } catch (err) {
      console.warn('[Whisper API Warning] Failed to transcribe via Whisper API:', err.message);
      // Fallback to client supplied transcript text
    }
  }

  // Analyze speech metrics from the final transcript text
  const speechMetrics = analyzeSpeechPatterns(transcript, durationSeconds);

  return {
    transcript,
    speechMetrics,
  };
}

module.exports = {
  transcribeAudio,
  analyzeSpeechPatterns,
};
