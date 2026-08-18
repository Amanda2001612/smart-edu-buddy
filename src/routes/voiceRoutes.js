/**
 * SmartEduBuddy Voice API
 *
 * Microphone
 *     ↓
 * Speech-to-Text
 *     ↓
 * Educational AI
 *     ↓
 * Complete Answer
 *     ↓
 * TTS
 */

const express =
    require(
        'express'
    );


const multer =
    require(
        'multer'
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


/**
 * Multer wrapper.
 */
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


/**
 * Public URL.
 */
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


/**
 * Actual robot voice endpoint.
 */
router.post(
    '/api/voice',

    voiceUploadMiddleware,

    async (
        req,
        res
    ) => {

        try {

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


            /**
             * STEP 1
             * VOICE → TEXT
             */
            const speechResult =
                await transcribeAudio(

                    req.file.buffer,

                    req.file.mimetype
                );


            const transcript =
                speechResult.transcript;


            if (
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


            /**
             * STEP 2
             * TEXT → COMPLETE AI ANSWER
             */
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


            /**
             * STEP 3
             * ANSWER → VOICE
             */
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


            return res.json({

                success:
                    aiResult.success,

                /**
                 * Exact speech transcript.
                 */
                transcript,

                /**
                 * Complete answer.
                 */
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


/**
 * Voice health.
 */
router.get(
    '/api/voice/health',
    (
        req,
        res
    ) => {

        res.json({

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

            timestamp:
                new Date()
                    .toISOString(),
        });
    }
);

/**
 * =====================================================
 * ESP8266 RAW WAV VOICE ENDPOINT
 * =====================================================
 *
 * IMPORTANT:
 *
 * Existing /api/voice route is NOT changed.
 *
 * This endpoint is only for the ESP8266 robot.
 *
 * POST:
 *
 * /api/voice/raw?childName=Kasun&childAge=9
 *
 * Header:
 *
 * Content-Type: audio/wav
 *
 * Body:
 *
 * Raw WAV audio bytes
 */

router.post(

    '/api/voice/raw',


    /**
     * Read raw WAV bytes directly.
     */
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
            // 1. RAW AUDIO BUFFER
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
                audioBuffer.length === 0
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
            // 2. CHILD PROFILE
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
            // 3. MIME TYPE
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


            /**
             * If ESP sends generic binary type,
             * treat it as WAV.
             */
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
            // 4. SAME EXISTING SPEECH API CALL
            //
            // DO NOT CHANGE THIS.
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
            // 5. SAME EXISTING GEMINI API CALL
            //
            // DO NOT CHANGE THIS.
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
            // 6. SAME EXISTING TTS CALL
            //
            // DO NOT CHANGE THIS.
            // =================================================

            const audio =
                await createAudio(
                    completeAnswer
                );


            const lang =
                audio.lang;


            // =================================================
            // 7. SAME AUDIO URL FORMAT
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


            // =================================================
            // 8. COMPACT ESP8266 RESPONSE
            // =================================================

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

module.exports =
    router;

    