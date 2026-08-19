/**
 * ============================================================
 * SmartEduBuddy Voice API
 * ============================================================
 *
 * Existing Working Flow:
 *
 * Browser / Android
 *      ↓
 * POST /api/voice
 *      ↓
 * Speech-to-Text
 *      ↓
 * Gemini Educational AI
 *      ↓
 * Complete Answer
 *      ↓
 * TTS
 *
 *
 * ESP8266 Direct Flow:
 *
 * POST /api/voice/raw
 *
 *
 * ESP8266 Async Flow:
 *
 * POST /api/voice/raw-start
 *      ↓
 * returns jobId immediately
 *      ↓
 * Background:
 * Speech → Gemini → TTS
 *      ↓
 * ESP8266 polls:
 * GET /api/voice/job/:jobId
 *      ↓
 * READY + audioUrl
 *
 * ============================================================
 */


const express =
    require(
        'express'
    );


const multer =
    require(
        'multer'
    );


const crypto =
    require(
        'crypto'
    );


const {

    transcribeAudio,

    isSupportedAudioType,

} =
    require(
        '../services/speechService'
    );


const {
    queryGemini,
} =
    require(
        '../services/aiService'
    );


const {
    createAudio,
} =
    require(
        '../services/ttsService'
    );


const {
    config,
} =
    require(
        '../config/config'
    );


const router =
    express.Router();


// ============================================================
// ROBOT ASYNC JOB STORAGE
// ============================================================

const robotJobs =
    new Map();


const ROBOT_JOB_TTL =
    15 *
    60 *
    1000;


// ============================================================
// CLEAN OLD ROBOT JOBS
// ============================================================

function cleanupRobotJobs() {

    const now =
        Date.now();


    for (
        const [
            jobId,
            job
        ]
        of robotJobs.entries()
    ) {

        if (
            now -
            job.createdAt >
            ROBOT_JOB_TTL
        ) {

            robotJobs.delete(
                jobId
            );
        }
    }
}


// ============================================================
// MULTER CONFIG
//
// Existing browser voice upload.
// DO NOT CHANGE WORKING FLOW.
// ============================================================

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits: {

            fileSize:
                config.upload.maxFileSize,

            files:
                1,
        },

        fileFilter: (
            req,
            file,
            callback
        ) => {

            if (
                isSupportedAudioType(
                    file.mimetype
                )
            ) {

                return callback(
                    null,
                    true
                );
            }


            return callback(
                new Error(
                    `Unsupported audio format: ${file.mimetype}`
                )
            );
        },
    });


// ============================================================
// MULTER WRAPPER
// ============================================================

function voiceUploadMiddleware(
    req,
    res,
    next
) {

    upload.single(
        'audio'
    )(
        req,
        res,

        error => {

            if (
                !error
            ) {

                return next();
            }


            if (
                error instanceof
                multer.MulterError
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        success:
                            false,

                        error:
                            error.code,

                        message:
                            error.message,
                    });
            }


            return res
                .status(
                    400
                )
                .json({

                    success:
                        false,

                    error:
                        'INVALID_AUDIO',

                    message:
                        error.message,
                });
        }
    );
}


// ============================================================
// PUBLIC SERVER URL
//
// Local:
// http://localhost:3000
//
// Render:
// https://smart-edu-buddy.onrender.com
// ============================================================

function getPublicBaseUrl(
    req
) {

    const protocol =
        req.headers[
        'x-forwarded-proto'
        ] ||
        req.protocol;


    return `${protocol}://${req.get('host')}`;
}


// ============================================================
// EXISTING WORKING ROUTE
//
// POST /api/voice
//
// Browser Voice Test
// Android App
//
// IMPORTANT:
// EXISTING API CALLS NOT CHANGED.
// ============================================================

router.post(

    '/api/voice',

    voiceUploadMiddleware,

    async (
        req,
        res
    ) => {

        try {

            // =================================================
            // AUDIO REQUIRED
            // =================================================

            if (
                !req.file
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        success:
                            false,

                        error:
                            'AUDIO_REQUIRED',

                        message:
                            'Microphone audio is required.',
                    });
            }


            // =================================================
            // CHILD PROFILE
            // =================================================

            const childName =
                String(

                    req.body.childName ||

                    req.body.name ||

                    config.child.defaultName
                )
                    .trim() ||

                config.child.defaultName;


            const childAge =
                Number(

                    req.body.childAge ||

                    req.body.age ||

                    config.child.defaultAge
                ) ||

                config.child.defaultAge;


            console.log('');

            console.log(
                '================================================='
            );


            console.log(
                '🎤 VOICE QUESTION RECEIVED'
            );


            console.log(
                `[Child] ${childName}, Age ${childAge}`
            );


            console.log(
                `[Audio] ${req.file.mimetype}`
            );


            console.log(
                `[Size] ${req.file.size} bytes`
            );


            // =================================================
            // STEP 1
            // VOICE → TEXT
            //
            // EXISTING WORKING CALL
            // =================================================

            const speechResult =
                await transcribeAudio(

                    req.file.buffer,

                    req.file.mimetype
                );


            const transcript =
                speechResult.transcript;


            // =================================================
            // NO SPEECH
            // =================================================

            if (
                !transcript ||
                transcript
                    .trim()
                    .toUpperCase() ===
                'NO_SPEECH'
            ) {

                return res
                    .status(
                        422
                    )
                    .json({

                        success:
                            false,

                        error:
                            'NO_SPEECH',

                        message:
                            'No understandable speech detected.',
                    });
            }


            console.log('');

            console.log(
                '👦 Child actually asked:'
            );


            console.log(
                transcript
            );


            // =================================================
            // STEP 2
            // TEXT → COMPLETE GEMINI ANSWER
            //
            // EXISTING WORKING CALL
            // =================================================

            const aiResult =
                await queryGemini(

                    transcript,

                    {

                        childName,

                        childAge,
                    }
                );


            const completeAnswer =
                aiResult.text;


            console.log('');

            console.log(
                '🤖 Complete AI Answer:'
            );


            console.log(
                completeAnswer
            );


            // =================================================
            // STEP 3
            // ANSWER → TTS
            //
            // EXISTING WORKING CALL
            // =================================================

            let audioUrl =
                null;


            let lang =
                /[\u0D80-\u0DFF]/.test(
                    completeAnswer
                )
                    ? 'si'
                    : 'en';


            try {

                const audio =
                    await createAudio(
                        completeAnswer
                    );


                lang =
                    audio.lang;


                audioUrl =
                    `${getPublicBaseUrl(req)}/audio/${audio.audioId}.mp3`;


            } catch (
            error
            ) {

                console.error(
                    '[Voice TTS Error]:',
                    error.message
                );
            }


            console.log(
                `[Language] ${lang}`
            );


            console.log(
                `[Answer Model] ${aiResult.model}`
            );


            console.log(
                `[Audio URL] ${audioUrl}`
            );


            console.log(
                '================================================='
            );


            // =================================================
            // RESPONSE
            // =================================================

            return res.json({

                success:
                    aiResult.success,

                transcript,

                answer:
                    completeAnswer,

                lang,

                restricted:
                    aiResult.restricted,

                restrictionReason:
                    aiResult.reason,

                speechModel:
                    speechResult.model,

                answerModel:
                    aiResult.model,

                finishReason:
                    aiResult.finishReason,

                questionSource:
                    'voice',

                child: {

                    name:
                        childName,

                    age:
                        childAge,
                },

                audioUrl,

                timestamp:
                    new Date()
                        .toISOString(),
            });


        } catch (
        error
        ) {

            console.error(
                '[Voice Route Error]:',
                error.message
            );


            return res
                .status(
                    500
                )
                .json({

                    success:
                        false,

                    error:
                        'VOICE_PROCESSING_ERROR',

                    message:
                        error.message,

                    timestamp:
                        new Date()
                            .toISOString(),
                });
        }
    }
);


// ============================================================
// EXISTING HEALTH ROUTE
//
// GET /api/voice/health
// ============================================================

router.get(

    '/api/voice/health',

    (
        req,
        res
    ) => {

        return res.json({

            success:
                true,

            service:
                'SmartEduBuddy Bilingual Voice API',

            status:
                'online',

            languages: [

                'Sinhala',

                'English',
            ],

            preferredModel:
                config.api.gemini
                    .model,

            robotEndpoints: {

                synchronous:
                    '/api/voice/raw',

                asyncStart:
                    '/api/voice/raw-start',

                asyncStatus:
                    '/api/voice/job/:jobId',
            },

            timestamp:
                new Date()
                    .toISOString(),
        });
    }
);


// ============================================================
// EXISTING RAW ESP8266 ENDPOINT
//
// POST /api/voice/raw
//
// This is kept.
// Nothing removed.
//
// But ESP8266 final code should use
// /api/voice/raw-start because the synchronous
// version can take longer than ESP8266 timeout.
// ============================================================

router.post(

    '/api/voice/raw',


    express.raw({

        type: [

            'audio/wav',

            'audio/x-wav',

            'application/octet-stream',
        ],

        limit:
            config.upload.maxFileSize,
    }),


    async (
        req,
        res
    ) => {

        try {

            console.log('');

            console.log(
                '==============================================='
            );


            console.log(
                '🎤 ESP8266 RAW VOICE RECEIVED'
            );


            // =================================================
            // RAW AUDIO
            // =================================================

            const audioBuffer =
                Buffer.isBuffer(
                    req.body
                )
                    ? req.body

                    : Buffer.from(
                        req.body ||
                        []
                    );


            if (
                !audioBuffer ||
                audioBuffer.length ===
                0
            ) {

                return res
                    .status(
                        400
                    )
                    .json({

                        success:
                            false,

                        error:
                            'AUDIO_REQUIRED',

                        message:
                            'Raw WAV audio is required.',
                    });
            }


            // =================================================
            // CHILD PROFILE
            // =================================================

            const childName =
                String(

                    req.query.childName ||

                    req.query.name ||

                    config.child.defaultName
                )
                    .trim() ||

                config.child.defaultName;


            const childAge =
                Number(

                    req.query.childAge ||

                    req.query.age ||

                    config.child.defaultAge
                ) ||

                config.child.defaultAge;


            console.log(
                `[Child] ${childName}, Age ${childAge}`
            );


            console.log(
                `[Audio Size] ${audioBuffer.length} bytes`
            );


            // =================================================
            // MIME TYPE
            // =================================================

            let mimeType =
                String(

                    req.headers[
                    'content-type'
                    ] ||

                    'audio/wav'
                )

                    .split(
                        ';'
                    )[0]

                    .trim()

                    .toLowerCase();


            if (
                mimeType ===
                'application/octet-stream'
            ) {

                mimeType =
                    'audio/wav';
            }


            console.log(
                `[Audio MIME] ${mimeType}`
            );


            // =================================================
            // SAME WORKING SPEECH CALL
            // =================================================

            const speechResult =
                await transcribeAudio(

                    audioBuffer,

                    mimeType
                );


            const transcript =
                speechResult.transcript;


            if (
                !transcript ||
                transcript
                    .trim()
                    .toUpperCase() ===
                'NO_SPEECH'
            ) {

                return res
                    .status(
                        422
                    )
                    .json({

                        success:
                            false,

                        error:
                            'NO_SPEECH',

                        message:
                            'No understandable speech detected.',
                    });
            }


            console.log('');

            console.log(
                '👦 Child actually asked:'
            );


            console.log(
                transcript
            );


            // =================================================
            // SAME WORKING GEMINI CALL
            // =================================================

            const aiResult =
                await queryGemini(

                    transcript,

                    {

                        childName,

                        childAge,
                    }
                );


            const completeAnswer =
                aiResult.text;


            if (
                !completeAnswer
            ) {

                throw new Error(
                    'Gemini returned empty answer.'
                );
            }


            console.log('');

            console.log(
                '🤖 Complete AI Answer:'
            );


            console.log(
                completeAnswer
            );


            // =================================================
            // SAME WORKING TTS CALL
            // =================================================

            const audio =
                await createAudio(
                    completeAnswer
                );


            const lang =
                audio.lang;


            // =================================================
            // SAME AUDIO URL
            // =================================================

            const publicBaseUrl =
                getPublicBaseUrl(
                    req
                );


            const audioUrl =
                `${publicBaseUrl}/audio/${audio.audioId}.mp3`;


            console.log(
                `[Language] ${lang}`
            );


            console.log(
                `[Speech Model] ${speechResult.model}`
            );


            console.log(
                `[Answer Model] ${aiResult.model}`
            );


            console.log(
                `[Audio URL] ${audioUrl}`
            );


            console.log(
                '==============================================='
            );


            return res
                .status(
                    200
                )
                .json({

                    success:
                        aiResult.success,

                    transcript,

                    lang,

                    restricted:
                        aiResult.restricted ||
                        false,

                    restrictionReason:
                        aiResult.reason ||
                        null,

                    speechModel:
                        speechResult.model ||
                        null,

                    answerModel:
                        aiResult.model ||
                        null,

                    audioUrl,

                    timestamp:
                        new Date()
                            .toISOString(),
                });


        } catch (
        error
        ) {

            console.error(
                '[ESP8266 Voice Error]:',
                error.message
            );


            return res
                .status(
                    500
                )
                .json({

                    success:
                        false,

                    error:
                        'ESP8266_VOICE_ERROR',

                    message:
                        error.message,

                    timestamp:
                        new Date()
                            .toISOString(),
                });
        }
    }
);


// ============================================================
// NEW ASYNC ESP8266 VOICE START
//
// POST
//
// /api/voice/raw-start?childName=Kasun&childAge=9
//
// Content-Type:
// audio/wav
//
// Body:
// raw question.wav
//
// IMPORTANT:
//
// ESP8266 does NOT wait here for Gemini.
// Server returns HTTP 202 + jobId quickly.
// ============================================================

router.post(

    '/api/voice/raw-start',


    express.raw({

        type: [

            'audio/wav',

            'audio/x-wav',

            'application/octet-stream',
        ],

        limit:
            config.upload.maxFileSize,
    }),


    async (
        req,
        res
    ) => {

        cleanupRobotJobs();


        // =====================================================
        // RAW AUDIO
        // =====================================================

        const audioBuffer =
            Buffer.isBuffer(
                req.body
            )
                ? req.body

                : Buffer.from(
                    req.body ||
                    []
                );


        if (
            !audioBuffer ||
            audioBuffer.length ===
            0
        ) {

            return res
                .status(
                    400
                )
                .json({

                    success:
                        false,

                    error:
                        'AUDIO_REQUIRED',

                    message:
                        'Raw WAV audio is required.',
                });
        }


        // =====================================================
        // CHILD PROFILE
        // =====================================================

        const childName =
            String(

                req.query.childName ||

                req.query.name ||

                config.child.defaultName
            )
                .trim() ||

            config.child.defaultName;


        const childAge =
            Number(

                req.query.childAge ||

                req.query.age ||

                config.child.defaultAge
            ) ||

            config.child.defaultAge;


        // =====================================================
        // MIME TYPE
        // =====================================================

        let mimeType =
            String(

                req.headers[
                'content-type'
                ] ||

                'audio/wav'
            )

                .split(
                    ';'
                )[0]

                .trim()

                .toLowerCase();


        if (
            mimeType ===
            'application/octet-stream'
        ) {

            mimeType =
                'audio/wav';
        }


        // =====================================================
        // CREATE JOB
        // =====================================================

        const jobId =
            crypto.randomUUID();


        const createdAt =
            Date.now();


        const publicBaseUrl =
            getPublicBaseUrl(
                req
            );


        robotJobs.set(

            jobId,

            {

                status:
                    'PROCESSING',

                createdAt,

                transcript:
                    null,

                lang:
                    null,

                audioUrl:
                    null,

                speechModel:
                    null,

                answerModel:
                    null,

                restricted:
                    false,

                restrictionReason:
                    null,

                error:
                    null,
            }
        );


        console.log('');

        console.log(
            '==============================================='
        );


        console.log(
            '🤖 ESP8266 ASYNC VOICE JOB CREATED'
        );


        console.log(
            `[Job ID] ${jobId}`
        );


        console.log(
            `[Child] ${childName}, Age ${childAge}`
        );


        console.log(
            `[Audio Size] ${audioBuffer.length} bytes`
        );


        console.log(
            `[Audio MIME] ${mimeType}`
        );


        // =====================================================
        // IMPORTANT:
        //
        // SEND RESPONSE TO ESP8266 IMMEDIATELY.
        //
        // No waiting for:
        // - Gemini transcription
        // - Gemini answer
        // - TTS
        // =====================================================

        res
            .status(
                202
            )
            .json({

                success:
                    true,

                jobId,

                status:
                    'PROCESSING',

                message:
                    'Voice uploaded. SmartEduBuddy is processing the question.',
            });


        // =====================================================
        // BACKGROUND PROCESSING
        // =====================================================

        (
            async () => {

                try {

                    console.log(
                        `[Robot Job ${jobId}] Speech recognition started`
                    );


                    // =========================================
                    // SAME WORKING SPEECH CALL
                    // =========================================

                    const speechResult =
                        await transcribeAudio(

                            audioBuffer,

                            mimeType
                        );


                    const transcript =
                        String(

                            speechResult.transcript ||

                            ''
                        )
                            .trim();


                    if (
                        !transcript ||
                        transcript
                            .toUpperCase() ===
                        'NO_SPEECH'
                    ) {

                        throw new Error(
                            'NO_SPEECH'
                        );
                    }


                    console.log(
                        `[Robot Job ${jobId}] CHILD SAID: ${transcript}`
                    );


                    // =========================================
                    // UPDATE JOB
                    // =========================================

                    const processingJob =
                        robotJobs.get(
                            jobId
                        );


                    if (
                        processingJob
                    ) {

                        processingJob.transcript =
                            transcript;


                        processingJob.speechModel =
                            speechResult.model ||
                            null;
                    }


                    // =========================================
                    // SAME WORKING GEMINI CALL
                    // =========================================

                    console.log(
                        `[Robot Job ${jobId}] Asking Gemini...`
                    );


                    const aiResult =
                        await queryGemini(

                            transcript,

                            {

                                childName,

                                childAge,
                            }
                        );


                    const completeAnswer =
                        String(

                            aiResult.text ||

                            ''
                        )
                            .trim();


                    if (
                        !completeAnswer
                    ) {

                        throw new Error(
                            'Gemini returned empty answer.'
                        );
                    }


                    console.log(
                        `[Robot Job ${jobId}] Gemini answer complete`
                    );


                    // =========================================
                    // SAME WORKING TTS CALL
                    // =========================================

                    console.log(
                        `[Robot Job ${jobId}] Creating TTS...`
                    );


                    const audio =
                        await createAudio(
                            completeAnswer
                        );


                    if (
                        !audio ||
                        !audio.audioId
                    ) {

                        throw new Error(
                            'TTS returned no audio ID.'
                        );
                    }


                    const audioUrl =
                        `${publicBaseUrl}/audio/${audio.audioId}.mp3`;


                    // =========================================
                    // JOB READY
                    // =========================================

                    robotJobs.set(

                        jobId,

                        {

                            status:
                                'READY',

                            createdAt,

                            transcript,

                            lang:
                                audio.lang,

                            audioUrl,

                            speechModel:
                                speechResult.model ||
                                null,

                            answerModel:
                                aiResult.model ||
                                null,

                            restricted:
                                aiResult.restricted ||
                                false,

                            restrictionReason:
                                aiResult.reason ||
                                null,

                            error:
                                null,
                        }
                    );


                    console.log('');

                    console.log(
                        `[Robot Job ${jobId}] ✅ READY`
                    );


                    console.log(
                        `[Robot Job ${jobId}] Audio URL: ${audioUrl}`
                    );


                } catch (
                error
                ) {

                    console.error(
                        `[Robot Job ${jobId}] ❌ ERROR:`,
                        error.message
                    );


                    const existingJob =
                        robotJobs.get(
                            jobId
                        );


                    robotJobs.set(

                        jobId,

                        {

                            status:
                                'ERROR',

                            createdAt,

                            transcript:
                                existingJob
                                    ?.transcript ||
                                null,

                            lang:
                                null,

                            audioUrl:
                                null,

                            speechModel:
                                existingJob
                                    ?.speechModel ||
                                null,

                            answerModel:
                                null,

                            restricted:
                                false,

                            restrictionReason:
                                null,

                            error:
                                error.message,
                        }
                    );
                }

            }
        )();
    }
);


// ============================================================
// NEW ESP8266 JOB STATUS
//
// GET
//
// /api/voice/job/:jobId
//
// Responses:
//
// PROCESSING
// READY
// ERROR
// ============================================================

router.get(

    '/api/voice/job/:jobId',

    (
        req,
        res
    ) => {

        cleanupRobotJobs();


        const jobId =
            req.params.jobId;


        const job =
            robotJobs.get(
                jobId
            );


        // =====================================================
        // JOB NOT FOUND
        // =====================================================

        if (
            !job
        ) {

            return res
                .status(
                    404
                )
                .json({

                    success:
                        false,

                    status:
                        'NOT_FOUND',

                    error:
                        'JOB_NOT_FOUND',

                    message:
                        'Voice processing job was not found or has expired.',
                });
        }


        // =====================================================
        // PROCESSING
        // =====================================================

        if (
            job.status ===
            'PROCESSING'
        ) {

            return res.json({

                success:
                    true,

                status:
                    'PROCESSING',

                transcript:
                    job.transcript,

                speechModel:
                    job.speechModel,

                message:
                    'SmartEduBuddy is still processing the question.',
            });
        }


        // =====================================================
        // ERROR
        // =====================================================

        if (
            job.status ===
            'ERROR'
        ) {

            return res.json({

                success:
                    false,

                status:
                    'ERROR',

                transcript:
                    job.transcript,

                error:
                    job.error,
            });
        }


        // =====================================================
        // READY
        // =====================================================

        return res.json({

            success:
                true,

            status:
                'READY',

            transcript:
                job.transcript,

            lang:
                job.lang,

            restricted:
                job.restricted,

            restrictionReason:
                job.restrictionReason,

            speechModel:
                job.speechModel,

            answerModel:
                job.answerModel,

            audioUrl:
                job.audioUrl,

            error:
                null,
        });
    }
);


// ============================================================
// MODULE EXPORT
//
// MUST BE LAST LINE
// ============================================================

module.exports =
    router;