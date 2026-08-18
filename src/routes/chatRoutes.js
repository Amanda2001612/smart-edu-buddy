/**
 * SmartEduBuddy Debug Chat Routes
 */

const express =
    require(
        'express'
    );


const {

    queryGemini,

    getAvailableModels,

} =
    require(
        '../services/aiService'
    );


const {

    createAudio,

    getAudioBuffer,

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


/**
 * Read question from GET/POST.
 */
function extractRequestData(
    req
) {

    const body =
        req.body || {};


    const prompt =

        body.question ||

        body.prompt ||

        body.message ||

        body.text ||

        req.query.question ||

        req.query.prompt ||

        req.query.message ||

        req.query.text ||

        '';


    const childName =

        body.childName ||

        body.name ||

        req.query.childName ||

        req.query.name ||

        config.child.defaultName;


    const childAge =

        body.childAge ||

        body.age ||

        req.query.childAge ||

        req.query.age ||

        config.child.defaultAge;


    return {

        prompt:
            String(
                prompt
            ).trim(),

        childName:
            String(
                childName
            ).trim(),

        childAge:
            Number(
                childAge
            ) ||
            config.child.defaultAge,
    };
}


/**
 * Local or Render URL.
 */
function getPublicBaseUrl(
    req
) {

    const proto =
        req.headers[
        'x-forwarded-proto'
        ] ||
        req.protocol;


    return `${proto}://${req.get('host')}`;
}


/**
 * Debug chat.
 */
async function handleChat(
    req,
    res
) {

    try {

        const {

            prompt,

            childName,

            childAge,

        } =
            extractRequestData(
                req
            );


        if (
            !prompt
        ) {

            return res
                .status(
                    400
                )
                .json({

                    success:
                        false,

                    error:
                        'QUESTION_REQUIRED',
                });
        }


        const aiResult =
            await queryGemini(
                prompt,
                {

                    childName,

                    childAge,
                }
            );


        const completeAnswer =
            aiResult.text;


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
                '[Chat TTS Error]:',
                error.message
            );
        }


        return res.json({

            success:
                aiResult.success,

            answer:
                completeAnswer,

            lang,

            restricted:
                aiResult.restricted,

            restrictionReason:
                aiResult.reason,

            model:
                aiResult.model,

            finishReason:
                aiResult.finishReason,

            child: {

                name:
                    childName,

                age:
                    childAge,
            },

            audioUrl,

            questionSource:
                'typed-debug',

            timestamp:
                new Date()
                    .toISOString(),
        });


    } catch (
    error
    ) {

        console.error(
            '[Chat Error]:',
            error
        );


        return res
            .status(
                500
            )
            .json({

                success:
                    false,

                error:
                    'CHAT_PROCESSING_ERROR',

                message:
                    error.message,
            });
    }
}


/**
 * Debug routes.
 */
router.get(
    [
        '/api/chat',
        '/ask',
    ],
    handleChat
);


router.post(
    [
        '/api/chat',
        '/ask',
    ],
    handleChat
);


/**
 * Health.
 */
router.get(
    '/api/health',
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            service:
                'SmartEduBuddy Brain',

            status:
                'online',

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
 * Models.
 */
router.get(
    '/api/models',
    async (
        req,
        res
    ) => {

        try {

            const models =
                await getAvailableModels();


            res.json({

                success:
                    true,

                preferredModel:
                    config.api.gemini
                        .model,

                models,
            });


        } catch (
        error
        ) {

            res
                .status(
                    500
                )
                .json({

                    success:
                        false,

                    error:
                        error.message,
                });
        }
    }
);


/**
 * MP3 endpoint.
 */
router.get(
    '/audio/:audioId.mp3',
    async (
        req,
        res
    ) => {

        try {

            const buffer =
                await getAudioBuffer(
                    req.params.audioId
                );


            if (
                !buffer
            ) {

                return res
                    .status(
                        404
                    )
                    .send(
                        'Audio not found or expired.'
                    );
            }


            const total =
                buffer.length;


            const range =
                req.headers.range;


            res.setHeader(
                'Content-Type',
                'audio/mpeg'
            );


            res.setHeader(
                'Accept-Ranges',
                'bytes'
            );


            res.setHeader(
                'Cache-Control',
                'no-store'
            );


            if (
                range
            ) {

                const match =
                    range.match(
                        /bytes=(\d*)-(\d*)/
                    );


                if (
                    match
                ) {

                    const start =
                        match[1]
                            ? Number(
                                match[1]
                            )
                            : 0;


                    const end =
                        match[2]
                            ? Number(
                                match[2]
                            )
                            : total - 1;


                    if (
                        start >= total ||
                        start > end
                    ) {

                        res.setHeader(
                            'Content-Range',
                            `bytes */${total}`
                        );


                        return res
                            .status(
                                416
                            )
                            .end();
                    }


                    const safeEnd =
                        Math.min(
                            end,
                            total - 1
                        );


                    const chunk =
                        buffer.subarray(
                            start,
                            safeEnd + 1
                        );


                    res.status(
                        206
                    );


                    res.setHeader(
                        'Content-Range',
                        `bytes ${start}-${safeEnd}/${total}`
                    );


                    res.setHeader(
                        'Content-Length',
                        chunk.length
                    );


                    return res.end(
                        chunk
                    );
                }
            }


            res.setHeader(
                'Content-Length',
                total
            );


            return res.end(
                buffer
            );


        } catch (
        error
        ) {

            console.error(
                '[Audio Error]:',
                error.message
            );


            return res
                .status(
                    500
                )
                .send(
                    'Audio streaming error.'
                );
        }
    }
);


module.exports =
    router;