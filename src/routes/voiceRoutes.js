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


module.exports =
    router;