var Buffer = require('buffer/').Buffer

export async function onRequest(ctx) {
    try {
        return await get_file(ctx);
    } catch (e) {
        return new Response(`${e.message}\n${e.stack}`, {
            status: 500
        });
    }
}

async function get_file({
    env,
    request
}) {
    const url = new URL(request.url);
    const url_params = new URLSearchParams(url.search);
    const host = url.host.split(':')[0];

    //Check if Password given
    if (url_params.get('pass') == undefined | url_params.get('pass') == null) {
        return new Response("403 - Access forbidden!\nNo password was given.", {
            status: 403,
        })
    }

    // Check if Password wrong
    if (url_params.get('pass') !== env['PW_' + host]) {
        console.log(host, env['PW_' + host], url_params.get('pass'));
        return new Response("That's not the right password for " + host, {
            status: 403,
        })
    }

    // Check if Filename given
    if (url_params.get('file') == undefined | url_params.get('file') == null) {
        return new Response("404 - File not found.\nYou have not requested a file!", {
            status: 404,
        })
    }

    //Try 5 times to get the file from webdav
    for (let i = 1; i <= 5; i++) {
        const filename = url_params.get('file');
        const auth = "Basic " + Buffer.from(`${env.WEBDAV_USERNAME}:${env.WEBDAV_PASSWORD}`, 'utf-8').toString("base64");
        console.log(`${i}. Try: ${filename}`);
        console.log(`${env.WEBDAV_URL}/${host}/${filename}`)
        let modRequest = new Request(`${env.WEBDAV_URL}/${host}/${filename}`, {
            method: request.method,
            headers: {
                "Authorization": auth
            }
        })
        var response = await fetch(modRequest)
        if (response.status == 200) { // file found - return
            break
        } else if (response.status == 404) { //file not found - return
            response = new Response("404 - File not found.\nRequested File: ${filename}", {
                status: 404,
            })
            break
        } else if (response.status == 401) { //authorization failed - try again
            response = new Response(`Server errored with ${response.status}. Auth failed.\nRequested File: ${filename}`, {
                status: 401,
            })
        } else (
            response = new Response(`Server errored with ${response.status}. Server is confused.\nRequested File: ${filename}`, {
                status: response.status,
            })
        )

    }
    return response
}