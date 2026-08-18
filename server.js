/**
 * SmartEduBuddy Server
 */

const dns =
    require(
        'node:dns'
    );


/**
 * Prefer IPv4 first.
 */
dns.setDefaultResultOrder(
    'ipv4first'
);


const {

    config,

    validateConfig,

} =
    require(
        './src/config/config'
    );


const app =
    require(
        './src/app'
    );


async function startServer() {

    try {

        console.log('');
        console.log(
            '==============================================='
        );

        console.log(
            '🤖 SmartEduBuddy Backend Starting...'
        );

        console.log(
            '==============================================='
        );


        validateConfig();


        console.log(
            '✅ Configuration validated'
        );

        console.log(
            `[Environment] ${config.app.env}`
        );

        console.log(
            `[Preferred Gemini Model] ${config.api.gemini.model}`
        );

        console.log(
            '[Languages] Sinhala + English'
        );

        console.log(
            '[Network] IPv4 first'
        );


        const server =
            app.listen(

                config.app.port,

                config.app.host,

                () => {

                    console.log('');
                    console.log(
                        '==============================================='
                    );

                    console.log(
                        '🚀 SmartEduBuddy Backend Online'
                    );

                    console.log(
                        `http://localhost:${config.app.port}`
                    );

                    console.log('');

                    console.log(
                        `Voice Test: http://localhost:${config.app.port}/voice-test.html`
                    );

                    console.log(
                        `Voice Health: http://localhost:${config.app.port}/api/voice/health`
                    );

                    console.log(
                        `Health: http://localhost:${config.app.port}/api/health`
                    );

                    console.log(
                        '==============================================='
                    );

                    console.log('');
                }
            );


        /**
         * Server errors.
         */
        server.on(
            'error',
            error => {

                console.error(
                    '[Server Error]:',
                    error
                );
            }
        );


        /**
         * Graceful shutdown.
         */
        function shutdown(
            signal
        ) {

            console.log(
                `[Server] ${signal} received`
            );


            server.close(
                () => {

                    console.log(
                        '✅ Server stopped'
                    );


                    process.exit(
                        0
                    );
                }
            );
        }


        process.on(
            'SIGINT',
            () =>
                shutdown(
                    'SIGINT'
                )
        );


        process.on(
            'SIGTERM',
            () =>
                shutdown(
                    'SIGTERM'
                )
        );


    } catch (
    error
    ) {

        console.error(
            '[Startup Error]:',
            error.message
        );


        process.exit(
            1
        );
    }
}


process.on(
    'unhandledRejection',
    reason => {

        console.error(
            '[Unhandled Rejection]:',
            reason
        );
    }
);


process.on(
    'uncaughtException',
    error => {

        console.error(
            '[Uncaught Exception]:',
            error
        );


        process.exit(
            1
        );
    }
);


startServer();