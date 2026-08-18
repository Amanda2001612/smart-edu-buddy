/**
 * SmartEduBuddy Bilingual TTS
 *
 * English answer
 *      ↓
 * lang=en
 *
 * Sinhala answer
 *      ↓
 * lang=si
 *
 * Complete answer is split into
 * TTS chunks without intentionally
 * shortening the answer.
 */

const googleTTS =
  require(
    'google-tts-api'
  );


const crypto =
  require(
    'crypto'
  );


const {
  config,
} =
  require(
    '../config/config'
  );


const audioStore =
  new Map();


const AUDIO_TTL =
  15 * 60 * 1000;


/**
 * Remove old audio.
 */
function cleanupAudioStore() {

  const now =
    Date.now();


  for (
    const [
      audioId,
      item,
    ]
    of audioStore.entries()
  ) {

    if (
      now -
      item.createdAt >
      AUDIO_TTL
    ) {

      audioStore.delete(
        audioId
      );
    }
  }
}


/**
 * Sinhala Unicode detection.
 */
function detectLanguage(
  text
) {

  const hasSinhala =
    /[\u0D80-\u0DFF]/.test(
      String(
        text || ''
      )
    );


  return hasSinhala
    ? 'si'
    : 'en';
}


/**
 * Clean formatting only.
 *
 * NO substring().
 * NO character truncation.
 */
function cleanText(
  text
) {

  return String(
    text || ''
  )

    .replace(
      /[*_#`~]/g,
      ''
    )

    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


/**
 * Download one TTS MP3 chunk.
 */
async function fetchAudioBuffer(
  url
) {

  const controller =
    new AbortController();


  const timer =
    setTimeout(
      () => {

        controller.abort();

      },
      config.api.googleTTS
        .timeoutMs
    );


  try {

    const response =
      await fetch(
        url,
        {

          method:
            'GET',

          redirect:
            'follow',

          headers: {

            'User-Agent':
              'Mozilla/5.0',

            Accept:
              'audio/mpeg,audio/*,*/*',
          },

          signal:
            controller.signal,
        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        `Google TTS HTTP ${response.status}`
      );
    }


    const arrayBuffer =
      await response
        .arrayBuffer();


    const buffer =
      Buffer.from(
        arrayBuffer
      );


    if (
      buffer.length ===
      0
    ) {

      throw new Error(
        'TTS returned empty audio.'
      );
    }


    return buffer;


  } finally {

    clearTimeout(
      timer
    );
  }
}


/**
 * Generate TTS for COMPLETE answer.
 */
async function generateCompleteAudio(
  text,
  lang
) {

  /**
   * getAllAudioUrls handles
   * long text using chunks.
   */
  const parts =
    googleTTS
      .getAllAudioUrls(
        text,
        {

          lang,

          slow:
            config.api.googleTTS
              .slow,

          host:
            config.api.googleTTS
              .host,

          splitPunct:
            ',.?;!:।',
        }
      );


  if (
    !parts ||
    parts.length === 0
  ) {

    throw new Error(
      'TTS generated no audio parts.'
    );
  }


  console.log(
    `[TTS] Language: ${lang}`
  );


  console.log(
    `[TTS] Answer characters: ${text.length}`
  );


  console.log(
    `[TTS] Audio chunks: ${parts.length}`
  );


  const buffers =
    [];


  for (
    let index = 0;
    index <
    parts.length;
    index++
  ) {

    const part =
      parts[index];


    console.log(
      `[TTS] Downloading ${index + 1}/${parts.length}`
    );


    const buffer =
      await fetchAudioBuffer(
        part.url
      );


    buffers.push(
      buffer
    );
  }


  return Buffer.concat(
    buffers
  );
}


/**
 * Create audio record.
 */
async function createAudio(
  text
) {

  cleanupAudioStore();


  const completeText =
    cleanText(
      text
    );


  if (
    !completeText
  ) {

    throw new Error(
      'Invalid TTS text.'
    );
  }


  const lang =
    detectLanguage(
      completeText
    );


  const audioId =
    crypto
      .randomUUID();


  const item = {

    text:
      completeText,

    lang,

    buffer:
      null,

    generationPromise:
      null,

    createdAt:
      Date.now(),
  };


  audioStore.set(
    audioId,
    item
  );


  /**
   * Generate immediately
   * in background.
   */
  item.generationPromise =
    generateCompleteAudio(
      completeText,
      lang
    )

      .then(
        buffer => {

          item.buffer =
            buffer;


          console.log(
            `[TTS] Complete audio ready: ${audioId}`
          );


          return buffer;
        }
      )

      .catch(
        error => {

          console.error(
            '[TTS Error]:',
            error.message
          );


          throw error;
        }
      );


  return {

    audioId,

    lang,

    spokenText:
      completeText,
  };
}


/**
 * Get final complete MP3.
 */
async function getAudioBuffer(
  audioId
) {

  cleanupAudioStore();


  const item =
    audioStore.get(
      audioId
    );


  if (
    !item
  ) {

    return null;
  }


  if (
    item.buffer
  ) {

    return item.buffer;
  }


  if (
    item.generationPromise
  ) {

    return await item
      .generationPromise;
  }


  return null;
}


module.exports = {

  createAudio,

  getAudioBuffer,

  detectLanguage,
};