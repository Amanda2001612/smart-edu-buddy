/**
 * SmartEduBuddy Speech Recognition
 *
 * Microphone
 *    ↓
 * WAV
 *    ↓
 * Gemini Files API
 *    ↓
 * Speech-to-Text
 */

const {
    config,
} = require('../config/config');


const SUPPORTED_AUDIO_TYPES =
    new Set([

        'audio/wav',

        'audio/x-wav',

        'audio/mpeg',

        'audio/mp3',

        'audio/aac',

        'audio/ogg',

        'audio/flac',

        'audio/aiff',

        'audio/x-aiff',
    ]);


let aiClient =
    null;

let createUserContentHelper =
    null;

let createPartFromUriHelper =
    null;


/**
 * Sleep helper.
 */
function sleep(
    ms
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


/**
 * Network error code.
 */
function getNetworkErrorCode(
    error
) {

    return (

        error?.cause?.code ||

        error?.cause
            ?.cause?.code ||

        error?.code ||

        ''
    );
}


/**
 * HTTP status from SDK error.
 */
function getHttpStatus(
    error
) {

    if (
        Number.isFinite(
            Number(
                error?.status
            )
        )
    ) {

        return Number(
            error.status
        );
    }


    if (
        Number.isFinite(
            Number(
                error?.statusCode
            )
        )
    ) {

        return Number(
            error.statusCode
        );
    }


    try {

        const parsed =
            JSON.parse(
                error?.message ||
                '{}'
            );


        if (
            parsed?.error?.code
        ) {

            return Number(
                parsed.error.code
            );
        }


    } catch (_) {

        // Ignore JSON parse error.
    }


    const message =
        String(
            error?.message || ''
        );


    const match =
        message.match(
            /\b(4\d\d|5\d\d)\b/
        );


    if (
        match
    ) {

        return Number(
            match[1]
        );
    }


    return null;
}


/**
 * Temporary/retryable errors.
 */
function isRetryableError(
    error
) {

    const code =
        String(
            getNetworkErrorCode(
                error
            )
        )
            .toUpperCase();


    const status =
        getHttpStatus(
            error
        );


    const retryableCodes =
        new Set([

            'ECONNRESET',

            'ETIMEDOUT',

            'EAI_AGAIN',

            'ECONNREFUSED',

            'UND_ERR_CONNECT_TIMEOUT',

            'UND_ERR_SOCKET',
        ]);


    if (
        retryableCodes.has(
            code
        )
    ) {

        return true;
    }


    if (
        status === 408 ||
        status === 429 ||
        (
            status >= 500 &&
            status <= 599
        )
    ) {

        return true;
    }


    const message =
        String(
            error?.message || ''
        )
            .toLowerCase();


    return (

        message.includes(
            'fetch failed'
        ) ||

        message.includes(
            'high demand'
        ) ||

        message.includes(
            'temporarily unavailable'
        )
    );
}


/**
 * Retry helper.
 */
async function withRetry(
    operation,
    name,
    maxAttempts = 3
) {

    let lastError =
        null;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            console.log(
                `[Speech] ${name} attempt ${attempt}/${maxAttempts}`
            );


            return await operation();


        } catch (
        error
        ) {

            lastError =
                error;


            const status =
                getHttpStatus(
                    error
                );


            const networkCode =
                getNetworkErrorCode(
                    error
                );


            console.error(
                `[Speech] ${name} failed`
            );


            console.error(
                `[Speech] HTTP Status: ${status || 'NONE'}`
            );


            console.error(
                `[Speech] Network Code: ${networkCode || 'NONE'}`
            );


            console.error(
                `[Speech] Message: ${error.message}`
            );


            if (
                !isRetryableError(
                    error
                )
            ) {

                throw error;
            }


            if (
                attempt >=
                maxAttempts
            ) {

                break;
            }


            const delay =
                1500 *
                Math.pow(
                    2,
                    attempt - 1
                ) +
                Math.floor(
                    Math.random() *
                    500
                );


            console.log(
                `[Speech] Waiting ${delay} ms...`
            );


            await sleep(
                delay
            );
        }
    }


    throw lastError;
}


/**
 * Gemini SDK client.
 */
async function getGeminiClient() {

    if (
        aiClient &&
        createUserContentHelper &&
        createPartFromUriHelper
    ) {

        return {

            ai:
                aiClient,

            createUserContent:
                createUserContentHelper,

            createPartFromUri:
                createPartFromUriHelper,
        };
    }


    const sdk =
        await import(
            '@google/genai'
        );


    const {

        GoogleGenAI,

        createUserContent,

        createPartFromUri,

    } = sdk;


    aiClient =
        new GoogleGenAI({

            apiKey:
                config.api.gemini
                    .apiKey,
        });


    createUserContentHelper =
        createUserContent;


    createPartFromUriHelper =
        createPartFromUri;


    return {

        ai:
            aiClient,

        createUserContent,

        createPartFromUri,
    };
}


/**
 * Normalize MIME.
 */
function normalizeMimeType(
    mimeType
) {

    const type =
        String(
            mimeType || ''
        )
            .toLowerCase()
            .trim();


    if (
        type === 'audio/x-wav'
    ) {

        return 'audio/wav';
    }


    if (
        type === 'audio/mp3'
    ) {

        return 'audio/mpeg';
    }


    if (
        type === 'audio/x-aiff'
    ) {

        return 'audio/aiff';
    }


    return type;
}


/**
 * Supported audio?
 */
function isSupportedAudioType(
    mimeType
) {

    return SUPPORTED_AUDIO_TYPES.has(

        String(
            mimeType || ''
        )
            .toLowerCase()
            .trim()
    );
}


/**
 * Clean transcript only.
 */
function cleanTranscript(
    text
) {

    return String(
        text || ''
    )

        .replace(
            /```/g,
            ''
        )

        .replace(
            /^transcript\s*:/i,
            ''
        )

        .replace(
            /^transcription\s*:/i,
            ''
        )

        .replace(
            /^child said\s*:/i,
            ''
        )

        .replace(
            /^question\s*:/i,
            ''
        )

        .replace(
            /\s+/g,
            ' '
        )

        .trim();
}


/**
 * Validate recording.
 */
function validateAudio(
    buffer,
    mimeType
) {

    if (
        !buffer ||
        !Buffer.isBuffer(
            buffer
        ) ||
        buffer.length === 0
    ) {

        throw new Error(
            'Microphone recording is empty.'
        );
    }


    if (
        !isSupportedAudioType(
            mimeType
        )
    ) {

        throw new Error(
            `Unsupported audio type: ${mimeType}`
        );
    }


    if (
        buffer.length >
        10 * 1024 * 1024
    ) {

        throw new Error(
            'Voice recording is too large.'
        );
    }
}


/**
 * Speech models.
 */
function getSpeechModels() {

    return [

        config.api.gemini.model,

        ...config.api.gemini
            .fallbackModels,

    ]
        .filter(
            Boolean
        )

        .filter(
            (
                model,
                index,
                list
            ) =>
                list.indexOf(
                    model
                ) === index
        );
}


/**
 * Transcribe using one model.
 */
async function transcribeUsingModel({

    ai,

    createUserContent,

    createPartFromUri,

    uploadedFile,

    model,

}) {

    const transcriptionPrompt = `
Listen carefully to the child's microphone recording.

Your ONLY task is speech-to-text transcription.

STRICT LANGUAGE RULES:

1. Return exactly what the child actually said.

2. Do NOT answer the child's question.

3. Do NOT explain anything.

4. Preserve the original spoken language.

5. If the child speaks Sinhala, return the transcript in natural Sinhala script.

6. If the child speaks English, return the transcript in English.

7. If the child mixes Sinhala and English, preserve the mixed language naturally.

8. Never translate Sinhala into English.

9. Never translate English into Sinhala.

10. Keep English technical terms if the child actually used them.

TRANSCRIPTION RULES:

11. Do not add labels such as "Transcript:", "Child said:", or "Question:".

12. Ignore small background noises.

13. Do not invent words that were not spoken.

14. Return only the spoken question.

15. If there is no understandable human speech, return exactly:

NO_SPEECH
`.trim();


    const result =
        await ai.models
            .generateContent({

                model,

                contents:
                    createUserContent(
                        [

                            createPartFromUri(

                                uploadedFile.uri,

                                uploadedFile.mimeType
                            ),

                            transcriptionPrompt,
                        ]
                    ),
            });


    const transcript =
        cleanTranscript(
            result?.text
        );


    if (
        !transcript
    ) {

        throw new Error(
            'Gemini returned no transcript.'
        );
    }


    return transcript;
}


/**
 * Main Speech-to-Text.
 */
async function transcribeAudio(
    audioBuffer,
    mimeType
) {

    validateAudio(
        audioBuffer,
        mimeType
    );


    const normalizedMime =
        normalizeMimeType(
            mimeType
        );


    console.log('');
    console.log(
        '==============================================='
    );

    console.log(
        '🎤 SMARTEDUBUDDY SPEECH RECOGNITION'
    );

    console.log(
        `[Speech] MIME: ${normalizedMime}`
    );

    console.log(
        `[Speech] Audio size: ${audioBuffer.length} bytes`
    );


    let uploadedFile =
        null;


    try {

        const {

            ai,

            createUserContent,

            createPartFromUri,

        } =
            await getGeminiClient();


        const audioBlob =
            new Blob(
                [
                    audioBuffer,
                ],
                {

                    type:
                        normalizedMime,
                }
            );


        console.log(
            '[Speech] Uploading microphone audio...'
        );


        uploadedFile =
            await withRetry(

                () =>
                    ai.files.upload({

                        file:
                            audioBlob,

                        config: {

                            mimeType:
                                normalizedMime,

                            displayName:
                                `smartedubuddy-question-${Date.now()}`,
                        },
                    }),

                'Audio Upload',

                3
            );


        if (
            !uploadedFile?.uri
        ) {

            throw new Error(
                'Gemini upload returned no file URI.'
            );
        }


        console.log(
            '✅ [Speech] Audio uploaded successfully'
        );


        const models =
            getSpeechModels();


        let lastError =
            null;


        for (
            const model
            of models
        ) {

            try {

                console.log(
                    `[Speech] Trying transcription model: ${model}`
                );


                const start =
                    Date.now();


                const transcript =
                    await withRetry(

                        () =>
                            transcribeUsingModel({

                                ai,

                                createUserContent,

                                createPartFromUri,

                                uploadedFile,

                                model,
                            }),

                        `Gemini Transcription (${model})`,

                        3
                    );


                const duration =
                    Date.now() -
                    start;


                console.log('');
                console.log(
                    '👦 CHILD SAID:'
                );

                console.log(
                    transcript
                );

                console.log(
                    `[Speech] Successful Model: ${model}`
                );

                console.log(
                    `[Speech] Time: ${duration} ms`
                );

                console.log(
                    '✅ Speech recognition complete'
                );

                console.log(
                    '==============================================='
                );


                return {

                    transcript,

                    model,

                    mimeType:
                        normalizedMime,

                    durationMs:
                        duration,
                };


            } catch (
            error
            ) {

                lastError =
                    error;


                console.warn(
                    `[Speech] Model ${model} failed: ${error.message}`
                );


                console.log(
                    '[Speech] Trying fallback model...'
                );
            }
        }


        throw (
            lastError ||
            new Error(
                'All transcription models failed.'
            )
        );


    } finally {

        /**
         * Delete temporary audio
         * from Gemini Files API.
         */
        if (
            uploadedFile?.name
        ) {

            try {

                const {
                    ai,
                } =
                    await getGeminiClient();


                await ai.files.delete({

                    name:
                        uploadedFile.name,
                });


                console.log(
                    '[Speech] Temporary audio deleted.'
                );


            } catch (
            error
            ) {

                console.warn(
                    '[Speech] Temporary audio cleanup failed:',
                    error.message
                );
            }
        }
    }
}


module.exports = {

    transcribeAudio,

    isSupportedAudioType,

    normalizeMimeType,
};