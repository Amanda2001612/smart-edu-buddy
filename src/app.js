/**
 * SmartEduBuddy Express App
 */

const express =
    require(
        'express'
    );


const cors =
    require(
        'cors'
    );


const path =
    require(
        'path'
    );


const {
    config,
} =
    require(
        './config/config'
    );


const chatRoutes =
    require(
        './routes/chatRoutes'
    );


const voiceRoutes =
    require(
        './routes/voiceRoutes'
    );


const app =
    express();


app.set(
    'trust proxy',
    true
);


/**
 * CORS
 */
app.use(
    cors({

        origin:
            config.cors.origin,
    })
);


/**
 * JSON.
 */
app.use(
    express.json({

        limit:
            '2mb',
    })
);


/**
 * Forms.
 */
app.use(
    express.urlencoded({

        extended:
            true,

        limit:
            '2mb',
    })
);


/**
 * Public test page.
 */
const publicDirectory =
    path.join(
        __dirname,
        '../public'
    );


app.use(
    express.static(
        publicDirectory
    )
);


/**
 * Home.
 */
app.get(
    '/',
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            name:
                config.app.name,

            version:
                config.app.version,

            status:
                'online',

            voiceLanguages: [

                'Sinhala',

                'English',
            ],

            endpoints: {

                health:
                    '/api/health',

                voiceHealth:
                    '/api/voice/health',

                voice:
                    '/api/voice',

                typedDebug:
                    '/api/chat',

                models:
                    '/api/models',

                voiceTest:
                    '/voice-test.html',
            },
        });
    }
);


/**
 * API routes.
 */
app.use(
    '/',
    chatRoutes
);


app.use(
    '/',
    voiceRoutes
);


/**
 * 404.
 */
app.use(
    (
        req,
        res
    ) => {

        res
            .status(
                404
            )
            .json({

                success:
                    false,

                error:
                    'ROUTE_NOT_FOUND',

                path:
                    req.originalUrl,
            });
    }
);


/**
 * Error handler.
 */
app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            '[Unhandled Error]:',
            error
        );


        res
            .status(
                500
            )
            .json({

                success:
                    false,

                error:
                    'INTERNAL_SERVER_ERROR',

                message:
                    error.message,
            });
    }
);


module.exports =
    app;