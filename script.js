/* =========================================================
       GameCube Banner Constants
       ========================================================= */

    const WIDTH = 96;

    const HEIGHT = 32;

    const BNR_HEADER_SIZE = 0x20;

    const BNR_PIXELDATA_SIZE =
        WIDTH * HEIGHT * 2;


    /* =========================================================
       Canvas
       ========================================================= */

    const canvas =
        document.getElementById(
            'previewCanvas'
        );


    const ctx =
        canvas.getContext('2d');


    let rawSourceImage = null;


    let loadedImageData =
        ctx.createImageData(
            WIDTH,
            HEIGHT
        );


    ctx.fillStyle = '#000';

    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );


    /* =========================================================
       RGB5A3 Conversion
       ========================================================= */

    function toRGB5A3(
        r,
        g,
        b,
        a
    ) {

        if (a >= 0xF8) {

            return (
                0x8000 |
                ((r >> 3) << 10) |
                ((g >> 3) << 5) |
                (b >> 3)
            );

        }


        return (
            ((a >> 5) << 12) |
            ((r >> 4) << 8) |
            ((g >> 4) << 4) |
            (b >> 4)
        );
    }


    function fromRGB5A3(val) {

        let r;
        let g;
        let b;
        let a;


        if (val & 0x8000) {

            r = Math.round(
                ((val >> 10) & 0x1F)
                * 255 / 31
            );


            g = Math.round(
                ((val >> 5) & 0x1F)
                * 255 / 31
            );


            b = Math.round(
                (val & 0x1F)
                * 255 / 31
            );


            a = 255;

        } else {

            a = Math.round(
                ((val >> 12) & 0x07)
                * 255 / 7
            );


            r = Math.round(
                ((val >> 8) & 0x0F)
                * 255 / 15
            );


            g = Math.round(
                ((val >> 4) & 0x0F)
                * 255 / 15
            );


            b = Math.round(
                (val & 0x0F)
                * 255 / 15
            );
        }


        return [
            r,
            g,
            b,
            a
        ];
    }


    /* =========================================================
       Encode Banner Pixels
       ========================================================= */

    function encodeBannerPixels(
        imgData
    ) {

        const out =
            new Uint8Array(
                BNR_PIXELDATA_SIZE
            );


        const data =
            imgData.data;


        let idx = 0;


        for (
            let tileY = 0;
            tileY < HEIGHT;
            tileY += 4
        ) {

            for (
                let tileX = 0;
                tileX < WIDTH;
                tileX += 4
            ) {

                for (
                    let y = tileY;
                    y < tileY + 4;
                    y++
                ) {

                    for (
                        let x = tileX;
                        x < tileX + 4;
                        x++
                    ) {

                        const pxIdx =
                            (y * WIDTH + x) * 4;


                        const val =
                            toRGB5A3(
                                data[pxIdx],
                                data[pxIdx + 1],
                                data[pxIdx + 2],
                                data[pxIdx + 3]
                            );


                        out[idx++] =
                            (val >> 8) & 0xFF;


                        out[idx++] =
                            val & 0xFF;
                    }
                }
            }
        }


        return out;
    }


    /* =========================================================
       Decode Banner Pixels
       ========================================================= */

    function decodeBannerPixels(
        uint8Array
    ) {

        const imgData =
            ctx.createImageData(
                WIDTH,
                HEIGHT
            );


        const data =
            imgData.data;


        let idx = 0;


        for (
            let tileY = 0;
            tileY < HEIGHT;
            tileY += 4
        ) {

            for (
                let tileX = 0;
                tileX < WIDTH;
                tileX += 4
            ) {

                for (
                    let y = tileY;
                    y < tileY + 4;
                    y++
                ) {

                    for (
                        let x = tileX;
                        x < tileX + 4;
                        x++
                    ) {

                        const val =
                            (uint8Array[idx] << 8) |
                            uint8Array[idx + 1];


                        idx += 2;


                        const [
                            r,
                            g,
                            b,
                            a
                        ] =
                            fromRGB5A3(val);


                        const pxIdx =
                            (y * WIDTH + x) * 4;


                        data[pxIdx] =
                            r;

                        data[pxIdx + 1] =
                            g;

                        data[pxIdx + 2] =
                            b;

                        data[pxIdx + 3] =
                            a;
                    }
                }
            }
        }


        return imgData;
    }


    /* =========================================================
       Load BNR
       ========================================================= */

    function handleBNRFile(file) {

        if (!file) return;


        const reader =
            new FileReader();


        reader.onload =
            function (e) {

                try {

                    const buffer =
                        new Uint8Array(
                            e.target.result
                        );


                    if (
                        buffer.length <
                        BNR_HEADER_SIZE +
                        BNR_PIXELDATA_SIZE
                    ) {

                        throw new Error(
                            'File is too small to be a valid opening.bnr'
                        );
                    }


                    const magic =
                        String.fromCharCode(
                            ...buffer.slice(
                                0,
                                4
                            )
                        );


                    if (
                        magic !== 'BNR1' &&
                        magic !== 'BNR2'
                    ) {

                        throw new Error(
                            'Invalid BNR header magic'
                        );
                    }


                    const pixelBytes =
                        buffer.slice(
                            BNR_HEADER_SIZE,
                            BNR_HEADER_SIZE +
                            BNR_PIXELDATA_SIZE
                        );


                    loadedImageData =
                        decodeBannerPixels(
                            pixelBytes
                        );


                    ctx.putImageData(
                        loadedImageData,
                        0,
                        0
                    );


                    rawSourceImage = null;


                    document
                        .getElementById('fitMode')
                        .disabled = true;


                    const metaOffset =
                        BNR_HEADER_SIZE +
                        BNR_PIXELDATA_SIZE;


                    const readStr =
                        (
                            offset,
                            size
                        ) => {

                            const bytes =
                                buffer.slice(
                                    offset,
                                    offset + size
                                );


                            let end =
                                bytes.indexOf(0);


                            if (end === -1) {
                                end = size;
                            }


                            let str = '';


                            for (
                                let i = 0;
                                i < end;
                                i++
                            ) {

                                str +=
                                    String.fromCharCode(
                                        bytes[i]
                                    );
                            }


                            return str;
                        };


                    const tShort =
                        readStr(
                            metaOffset,
                            0x20
                        );


                    const aShort =
                        readStr(
                            metaOffset + 0x20,
                            0x20
                        );


                    const tLong =
                        readStr(
                            metaOffset + 0x40,
                            0x40
                        );


                    const aLong =
                        readStr(
                            metaOffset + 0x80,
                            0x40
                        );


                    const desc =
                        readStr(
                            metaOffset + 0xC0,
                            0x80
                        );


                    document
                        .getElementById('titleInput')
                        .value =
                        tLong || tShort;


                    document
                        .getElementById('authorInput')
                        .value =
                        aLong || aShort;


                    document
                        .getElementById('descInput')
                        .value =
                        desc;

                }

                catch (err) {

                    alert(
                        'Failed to parse BNR file: ' +
                        err.message
                    );
                }

            };


        reader.readAsArrayBuffer(file);
    }


    /* =========================================================
       Load Image
       ========================================================= */

    function handleImageFile(file) {

        if (!file) return;


        const reader =
            new FileReader();


        reader.onload =
            function (e) {

                const img =
                    new Image();


                img.onload =
                    function () {

                        rawSourceImage =
                            img;


                        document
                            .getElementById(
                                'fitMode'
                            )
                            .disabled = false;


                        if (
                            !document
                                .getElementById(
                                    'titleInput'
                                )
                                .value
                        ) {

                            const lastDot =
                                file.name.lastIndexOf(
                                    '.'
                                );


                            const name =
                                lastDot > 0
                                    ? file.name.substring(
                                        0,
                                        lastDot
                                    )
                                    : file.name;


                            document
                                .getElementById(
                                    'titleInput'
                                )
                                .value =
                                name;
                        }


                        reprocessImage();
                    };


                img.src =
                    e.target.result;
            };


        reader.readAsDataURL(file);
    }


    /* =========================================================
       Process Image
       ========================================================= */

    function reprocessImage() {

        if (!rawSourceImage) {
            return;
        }


        const mode =
            document
                .getElementById(
                    'fitMode'
                )
                .value;


        const offCanvas =
            document.createElement(
                'canvas'
            );


        offCanvas.width =
            WIDTH;


        offCanvas.height =
            HEIGHT;


        const offCtx =
            offCanvas.getContext(
                '2d'
            );


        offCtx.clearRect(
            0,
            0,
            WIDTH,
            HEIGHT
        );


        if (mode === 'stretch') {

            offCtx.drawImage(
                rawSourceImage,
                0,
                0,
                WIDTH,
                HEIGHT
            );

        }

        else {

            const srcW =
                rawSourceImage.width;


            const srcH =
                rawSourceImage.height;


            const scale =
                mode === 'cover'
                    ? Math.max(
                        WIDTH / srcW,
                        HEIGHT / srcH
                    )
                    : Math.min(
                        WIDTH / srcW,
                        HEIGHT / srcH
                    );


            const newW =
                Math.max(
                    1,
                    Math.round(
                        srcW * scale
                    )
                );


            const newH =
                Math.max(
                    1,
                    Math.round(
                        srcH * scale
                    )
                );


            if (mode === 'cover') {

                const left =
                    Math.floor(
                        (newW - WIDTH) / 2
                    );


                const top =
                    Math.floor(
                        (newH - HEIGHT) / 2
                    );


                offCtx.drawImage(
                    rawSourceImage,

                    left / scale,
                    top / scale,

                    WIDTH / scale,
                    HEIGHT / scale,

                    0,
                    0,

                    WIDTH,
                    HEIGHT
                );

            }

            else {

                const x =
                    Math.floor(
                        (WIDTH - newW) / 2
                    );


                const y =
                    Math.floor(
                        (HEIGHT - newH) / 2
                    );


                offCtx.drawImage(
                    rawSourceImage,

                    0,
                    0,

                    srcW,
                    srcH,

                    x,
                    y,

                    newW,
                    newH
                );
            }
        }


        loadedImageData =
            offCtx.getImageData(
                0,
                0,
                WIDTH,
                HEIGHT
            );


        ctx.putImageData(
            loadedImageData,
            0,
            0
        );
    }


    /* =========================================================
       Export BNR
       ========================================================= */

    function exportBNR() {

        const buffer =
            new ArrayBuffer(
                BNR_HEADER_SIZE +
                BNR_PIXELDATA_SIZE +
                320
            );


        const bytes =
            new Uint8Array(
                buffer
            );


        /* Header */

        bytes[0] = 0x42;
        bytes[1] = 0x4E;
        bytes[2] = 0x52;
        bytes[3] = 0x31;


        /* Pixel Data */

        const pixelBytes =
            encodeBannerPixels(
                loadedImageData
            );


        bytes.set(
            pixelBytes,
            BNR_HEADER_SIZE
        );


        /* Metadata */

        const title =
            document
                .getElementById(
                    'titleInput'
                )
                .value ||
            'Untitled';


        const author =
            document
                .getElementById(
                    'authorInput'
                )
                .value ||
            'Unknown';


        const desc =
            document
                .getElementById(
                    'descInput'
                )
                .value ||
            '';


        let offset =
            BNR_HEADER_SIZE +
            BNR_PIXELDATA_SIZE;


        const fields = [

            {
                text: title,
                size: 0x20
            },

            {
                text: author,
                size: 0x20
            },

            {
                text: title,
                size: 0x40
            },

            {
                text: author,
                size: 0x40
            },

            {
                text: desc,
                size: 0x80
            }

        ];


        fields.forEach(
            field => {

                for (
                    let i = 0;

                    i <
                    field.size - 1 &&
                    i <
                    field.text.length;

                    i++
                ) {

                    bytes[
                        offset + i
                    ] =
                        field.text
                            .charCodeAt(i) &
                        0xFF;
                }


                offset +=
                    field.size;
            }
        );


        downloadBlob(
            new Blob(
                [buffer],
                {
                    type:
                        'application/octet-stream'
                }
            ),
            'opening.bnr'
        );
    }


    /* =========================================================
       Export BMP
       ========================================================= */

    function exportBMP() {

        const pixelDataSize =
            WIDTH *
            HEIGHT *
            2;


        const fileSize =
            54 +
            pixelDataSize;


        const buffer =
            new ArrayBuffer(
                fileSize
            );


        const view =
            new DataView(
                buffer
            );


        const bytes =
            new Uint8Array(
                buffer
            );


        /* BMP Header */

        bytes[0] = 0x42;
        bytes[1] = 0x4D;


        view.setUint32(
            2,
            fileSize,
            true
        );


        view.setUint32(
            6,
            0,
            true
        );


        view.setUint32(
            10,
            54,
            true
        );


        /* Info Header */

        view.setUint32(
            14,
            40,
            true
        );


        view.setInt32(
            18,
            WIDTH,
            true
        );


        view.setInt32(
            22,
            HEIGHT,
            true
        );


        view.setUint16(
            26,
            1,
            true
        );


        view.setUint16(
            28,
            16,
            true
        );


        view.setUint32(
            30,
            0,
            true
        );


        /* Pixel Data */

        const pixels =
            loadedImageData.data;


        let offset = 54;


        for (
            let y = HEIGHT - 1;
            y >= 0;
            y--
        ) {

            for (
                let x = 0;
                x < WIDTH;
                x++
            ) {

                const pxIdx =
                    (y * WIDTH + x) * 4;


                const r5 =
                    (pixels[pxIdx] >> 3) &
                    0x1F;


                const g5 =
                    (pixels[pxIdx + 1] >> 3) &
                    0x1F;


                const b5 =
                    (pixels[pxIdx + 2] >> 3) &
                    0x1F;


                const packed =
                    (r5 << 10) |
                    (g5 << 5) |
                    b5;


                view.setUint16(
                    offset,
                    packed,
                    true
                );


                offset += 2;
            }
        }


        downloadBlob(
            new Blob(
                [buffer],
                {
                    type:
                        'image/bmp'
                }
            ),
            'banner.bmp'
        );
    }


    /* =========================================================
       Download Helper
       ========================================================= */

    function downloadBlob(
        blob,
        filename
    ) {

        const url =
            URL.createObjectURL(
                blob
            );


        const a =
            document.createElement(
                'a'
            );


        a.href = url;

        a.download = filename;


        document.body.appendChild(
            a
        );


        a.click();


        document.body.removeChild(
            a
        );


        URL.revokeObjectURL(
            url
        );
    }


    /* =========================================================
       Collapsible Dynamic README
       ========================================================= */

    const documentationToggle =
        document.getElementById(
            'documentationToggle'
        );


    const documentationToggleIcon =
        document.getElementById(
            'documentationToggleIcon'
        );


    const readmeContent =
        document.getElementById(
            'readme-content'
        );


    let readmeLoaded = false;


    documentationToggle.addEventListener(
        'click',
        async function () {

            const isExpanded =
                documentationToggle
                    .getAttribute(
                        'aria-expanded'
                    ) === 'true';


            /* -------------------------------------------------
               Collapse
               ------------------------------------------------- */

            if (isExpanded) {

                documentationToggle
                    .setAttribute(
                        'aria-expanded',
                        'false'
                    );


                documentationToggle
                    .classList
                    .remove(
                        'expanded'
                    );


                readmeContent.hidden =
                    true;


                return;
            }


            /* -------------------------------------------------
               Expand
               ------------------------------------------------- */

            documentationToggle
                .setAttribute(
                    'aria-expanded',
                    'true'
                );


            documentationToggle
                .classList
                .add(
                    'expanded'
                );


            readmeContent.hidden =
                false;


            /* -------------------------------------------------
               Only load README once
               ------------------------------------------------- */

            if (!readmeLoaded) {

                await loadReadme();

                readmeLoaded =
                    true;
            }

        }
    );


    /* =========================================================
       Load README from GitHub
       ========================================================= */

    async function loadReadme() {

        const readmeURL =
            'https://raw.githubusercontent.com/' +
            'git2358/GameCube-Banner-Editor-Converter/' +
            'main/README.md';


        try {

            const response =
                await fetch(
                    readmeURL,
                    {
                        cache: 'no-cache'
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const markdown =
                await response.text();


            /* Configure Markdown */

            marked.setOptions({

                gfm: true,

                breaks: false,

                mangle: false

            });


            /* Markdown → HTML */

            const html =
                marked.parse(
                    markdown
                );


            /* Sanitize HTML */

            readmeContent.innerHTML =
                DOMPurify.sanitize(
                    html,
                    {
                        USE_PROFILES: {
                            html: true
                        }
                    }
                );


            /* -------------------------------------------------
               Fix links

               Internal README anchors stay in the app.

               External links open in a new tab.
               ------------------------------------------------- */

            readmeContent
                .querySelectorAll(
                    'a'
                )
                .forEach(
                    link => {

                        const href =
                            link.getAttribute(
                                'href'
                            );


                        if (
                            href &&
                            !href.startsWith(
                                '#'
                            )
                        ) {

                            link.setAttribute(
                                'target',
                                '_blank'
                            );


                            link.setAttribute(
                                'rel',
                                'noopener noreferrer'
                            );
                        }

                    }
                );


        }

        catch (error) {

            console.error(
                'Failed to load README:',
                error
            );


            readmeContent.innerHTML = `

                <div class="readme-error">

                    <p>
                        Unable to load the documentation automatically.
                    </p>

                    <p style="margin-top: 10px;">

                        <a
                            href="https://github.com/git2358/GameCube-Banner-Editor-Converter/blob/main/README.md"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open README on GitHub ↗
                        </a>

                    </p>

                </div>

            `;
        }
    }
