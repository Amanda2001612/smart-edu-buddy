/**
 * SmartEduBuddy Uptime Route
 *
 * Used by UptimeRobot to keep
 * the Render web service awake.
 */

const express = require('express');

const router = express.Router();


function uptimeResponse(req, res) {

    const now =
        new Date();


    res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate'
    );


    return res
        .status(200)
        .json({

            success: true,

            service:
                'SmartEduBuddy',

            status:
                'awake',

            purpose:
                'uptime-monitor',

            timestamp:
                now.toISOString(),

            uptimeSeconds:
                Math.floor(
                    process.uptime()
                ),
        });
}


/**
 * UptimeRobot HTTP monitors can use HEAD.
 * Keep both GET and HEAD available.
 */

router.get(
    '/api/uptime',
    uptimeResponse
);


router.head(
    '/api/uptime',
    (
        req,
        res
    ) => {

        res.setHeader(
            'Cache-Control',
            'no-store'
        );


        return res
            .status(200)
            .end();
    }
);


module.exports =
    router;