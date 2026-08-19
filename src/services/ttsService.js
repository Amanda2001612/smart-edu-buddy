/**
 * ============================================================
 * SmartEduBuddy Bilingual TTS
 * ============================================================
 *
 * English answer
 *      ↓
 * lang=en
 *
 * Sinhala answer
 *      ↓
 * lang=si
 *
 * IMPORTANT:
 *
 * The COMPLETE answer is converted to speech.
 *
 * Long answers are split into Google TTS chunks.
 *
 * ALL chunks are downloaded first.
 *
 * ALL chunks are merged.
 *
 * ONLY THEN createAudio() returns.
 *
 * Therefore:
 *
 * TTS COMPLETE
 *      ↓
 * Robot Job READY
 *      ↓
 * ESP8266 downloads final MP3
 *      ↓
 * Speaker
 *
 * ============================================================
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


// ============================================================
// IN-MEMORY AUDIO STORE
// ============================================================

const audioStore =
  new Map();


const AUDIO_TTL =
  15 * 60 * 1000;


// ============================================================
// REMOVE OLD AUDIO
// ============================================================

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


      console.log(
        `[TTS] Removed expired audio: ${audioId}`
      );
    }
  }
}


// ============================================================
// LANGUAGE DETECTION
//
// Sinhala Unicode range:
// U+0D80 → U+0DFF
// ============================================================

function detectLanguage(
  text
) {

  const value =
    String(
      text || ''
    );


  const hasSinhala =
    /[\u0D80-\u0DFF]/.test(
      value
    );


  return hasSinhala
    ? 'si'
    : 'en';
}


// ============================================================
// CLEAN TEXT
//
// IMPORTANT:
//
// This function DOES NOT shorten
// the educational answer.
//
// No substring()
// No slice()
// No fixed character limit
//
// Only formatting is cleaned.
// ============================================================

function cleanText(
  text
) {

  return String(
    text || ''
  )

    // Remove markdown formatting.
    .replace(
      /[*_#`~]/g,
      ''
    )

    // Normalize whitespace.
    .replace(
      /\s+/g,
      ' '
    )

    .trim();
}


// ============================================================
// DOWNLOAD ONE GOOGLE TTS CHUNK
// ============================================================

async function fetchAudioBuffer(
  url,
  index,
  total
) {

  const controller =
    new AbortController();


  const timeoutMs =
    Number(
      config.api.googleTTS
        .timeoutMs
    ) ||
    30000;


  const timer =
    setTimeout(
      () => {

        controller.abort();

      },
      timeoutMs
    );


  try {

    console.log(
      `[TTS] Fetching chunk ${index}/${total}`
    );


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
        `Google TTS HTTP ${response.status} on chunk ${index}/${total}`
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
        `TTS returned empty audio for chunk ${index}/${total}`
      );
    }


    console.log(
      `[TTS] Chunk ${index}/${total} downloaded: ${buffer.length} bytes`
    );


    return buffer;


  } catch (
  error
  ) {

    if (
      error.name ===
      'AbortError'
    ) {

      throw new Error(
        `Google TTS timeout on chunk ${index}/${total}`
      );
    }


    throw error;


  } finally {

    clearTimeout(
      timer
    );
  }
}


// ============================================================
// GENERATE COMPLETE AUDIO
//
// getAllAudioUrls()
// automatically splits long text.
//
// Example:
//
// Long educational answer
//      ↓
// Part 1
// Part 2
// Part 3
//      ↓
// Download ALL
//      ↓
// Buffer.concat()
//      ↓
// One complete MP3 buffer
// ============================================================

async function generateCompleteAudio(
  text,
  lang
) {

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
    parts.length ===
    0
  ) {

    throw new Error(
      'TTS generated no audio parts.'
    );
  }


  console.log('');

  console.log(
    '==============================================='
  );


  console.log(
    '🔊 SMARTEDUBUDDY TTS'
  );


  console.log(
    `[TTS] Language: ${lang}`
  );


  console.log(
    `[TTS] Answer characters: ${text.length}`
  );


  console.log(
    `[TTS] Audio chunks: ${parts.length}`
  );


  console.log(
    '==============================================='
  );


  const buffers =
    [];


  let totalBytes =
    0;


  // ==========================================================
  // IMPORTANT:
  //
  // Sequential await.
  //
  // We do NOT finish until every
  // TTS audio chunk has downloaded.
  // ==========================================================

  for (
    let index = 0;
    index <
    parts.length;
    index++
  ) {

    const part =
      parts[index];


    console.log('');

    console.log(
      `[TTS] Downloading ${index + 1}/${parts.length}`
    );


    if (
      !part ||
      !part.url
    ) {

      throw new Error(
        `Invalid TTS URL at chunk ${index + 1}`
      );
    }


    const buffer =
      await fetchAudioBuffer(

        part.url,

        index + 1,

        parts.length
      );


    buffers.push(
      buffer
    );


    totalBytes +=
      buffer.length;


    console.log(
      `[TTS] Progress: ${index + 1}/${parts.length}`
    );
  }


  // ==========================================================
  // MERGE EVERY MP3 CHUNK
  // ==========================================================

  const completeBuffer =
    Buffer.concat(
      buffers
    );


  if (
    !completeBuffer ||
    completeBuffer.length ===
    0
  ) {

    throw new Error(
      'Final TTS audio buffer is empty.'
    );
  }


  console.log('');

  console.log(
    `[TTS] All ${parts.length} chunks downloaded`
  );


  console.log(
    `[TTS] Expected merged bytes: ${totalBytes}`
  );


  console.log(
    `[TTS] Final MP3 bytes: ${completeBuffer.length}`
  );


  console.log(
    '✅ [TTS] COMPLETE AUDIO GENERATED'
  );


  console.log(
    '==============================================='
  );


  return completeBuffer;
}


// ============================================================
// CREATE AUDIO
//
// CRITICAL FIX:
//
// OLD:
// ------
//
// generateCompleteAudio(...)
//     .then(...);
//
// return {
//    audioId
// };
//
// That returned BEFORE audio was complete.
//
//
// NEW:
// ------
//
// const completeBuffer =
//     await generateCompleteAudio(...);
//
// ONLY THEN return audioId.
//
// ============================================================

async function createAudio(
  text
) {

  cleanupAudioStore();


  // ==========================================================
  // CLEAN COMPLETE ANSWER
  // ==========================================================

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


  // ==========================================================
  // DETECT LANGUAGE
  // ==========================================================

  const lang =
    detectLanguage(
      completeText
    );


  // ==========================================================
  // CREATE AUDIO ID
  // ==========================================================

  const audioId =
    crypto
      .randomUUID();


  console.log('');

  console.log(
    `[TTS] Creating complete audio: ${audioId}`
  );


  // ==========================================================
  // CREATE STORE RECORD
  // ==========================================================

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


  try {

    // ========================================================
    // CRITICAL:
    //
    // STORE PROMISE
    // ========================================================

    item.generationPromise =
      generateCompleteAudio(
        completeText,
        lang
      );


    // ========================================================
    // CRITICAL FIX:
    //
    // WAIT HERE.
    //
    // createAudio() will NOT return
    // until:
    //
    // chunk 1 downloaded
    // chunk 2 downloaded
    // chunk 3 downloaded
    // ...
    // merged MP3 complete
    //
    // ========================================================

    const completeBuffer =
      await item
        .generationPromise;


    // ========================================================
    // SAVE FINAL COMPLETE AUDIO
    // ========================================================

    item.buffer =
      completeBuffer;


    /*
     * Promise is no longer needed
     * because buffer is ready.
     */
    item.generationPromise =
      null;


    console.log('');

    console.log(
      `[TTS] Complete audio ready: ${audioId}`
    );


    console.log(
      `[TTS] Stored bytes: ${item.buffer.length}`
    );


    console.log(
      `[TTS] createAudio() completed successfully`
    );


    // ========================================================
    // ONLY RETURN AFTER COMPLETE AUDIO IS READY
    // ========================================================

    return {

      audioId,

      lang,

      spokenText:
        completeText,

      size:
        item.buffer.length,
    };


  } catch (
  error
  ) {

    console.error(
      '[TTS Error]:',
      error.message
    );


    // Remove broken audio record.
    audioStore.delete(
      audioId
    );


    throw error;
  }
}


// ============================================================
// GET COMPLETE MP3 BUFFER
//
// Used by:
//
// GET /audio/:audioId.mp3
//
// Because createAudio() now waits,
// normally item.buffer is already ready.
//
// Promise support is kept as fallback.
// ============================================================

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

    console.log(
      `[TTS] Audio not found: ${audioId}`
    );


    return null;
  }


  // ==========================================================
  // NORMAL CASE:
  // COMPLETE AUDIO ALREADY READY
  // ==========================================================

  if (
    item.buffer
  ) {

    console.log(
      `[TTS] Serving complete audio: ${audioId}`
    );


    console.log(
      `[TTS] Audio bytes: ${item.buffer.length}`
    );


    return item.buffer;
  }


  // ==========================================================
  // SAFETY FALLBACK
  // ==========================================================

  if (
    item.generationPromise
  ) {

    console.log(
      `[TTS] Waiting for audio generation: ${audioId}`
    );


    try {

      const buffer =
        await item
          .generationPromise;


      item.buffer =
        buffer;


      item.generationPromise =
        null;


      return buffer;


    } catch (
    error
    ) {

      console.error(
        `[TTS] Generation failed for ${audioId}:`,
        error.message
      );


      audioStore.delete(
        audioId
      );


      throw error;
    }
  }


  return null;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  createAudio,

  getAudioBuffer,

  detectLanguage,
};