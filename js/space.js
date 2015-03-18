var SPACE = (function () {

    var shaderProgram;

    /*
     *Models first
     */

    /*
     * Model for the viewer
     */
    var Viewer = function () {
        this.position = {x:0, y:0, z:0};
        this.bounds = {x:48, y:48, z:48};
        this.horizontalRotation = 0;
        this.verticalRotation = 0;
    };

    Viewer.prototype.setupView = function (context, pMatrix, mvMatrix) {
        mat4.perspective(45, context.canvasWidth / context.canvasHeight, 1, 510.0, pMatrix);
        mat4.identity(mvMatrix);
        mat4.rotate(mvMatrix, this.verticalRotation, [1, 0, 0]);
        mat4.rotate(mvMatrix, this.horizontalRotation, [0, 1, 0]);
        mat4.translate(mvMatrix, [-this.position.x, -this.position.y, -this.position.z]);
    };

    Viewer.prototype.animate = function () {};

    Viewer.prototype.lookAt = function(position) {
        this.horizontalRotation = -Math.atan((viewer.position.x - position.x) / (viewer.position.z - position.z));
        this.verticalRotation = Math.atan((viewer.position.y - position.y) / (viewer.position.z - position.z));
    };

    Viewer.prototype.moveForward = function (forward, onXZPlane, sceneRoot) {
        var lookVector = [0, 0, -1];
        var viewVector = [0, 0, -1];

        tmpMatrix = mat4.create();
        mat4.identity(tmpMatrix);
        mat4.rotate(tmpMatrix, this.horizontalRotation, [0, 1, 0]);
        if (!onXZPlane) mat4.rotate(tmpMatrix, this.verticalRotation, [1, 0, 0]);

        mat4.multiplyVec3(tmpMatrix, lookVector, viewVector);

        if (sceneRoot) {
            var canMove = canMoveForward();
            if ((forward && canMove == 'noForward') || (!forward && canMove == 'noBackward')) return;
        }
        if (forward) {
            if (this.checkBounds(viewVector, true)) {
                this.position.x -= viewVector[0];
                this.position.y -= viewVector[1];
                this.position.z += viewVector[2];
            }
        }
        else if (this.checkBounds(viewVector, false)) {
            this.position.x += viewVector[0];
            this.position.y += viewVector[1];
            this.position.z -= viewVector[2];
        }
    };

    Viewer.prototype.checkBounds = function (viewVector, forward) {
        if (!forward) {
            viewVector[0] = -1 * viewVector[0];
            viewVector[1] = -1 * viewVector[1];
            viewVector[2] = -1 * viewVector[2];
        }
        var wouldBeOutOfBounds = (Math.abs(this.position.x - viewVector[0]) < this.bounds.x) &&
            (Math.abs(this.position.y - viewVector[1]) < this.bounds.y) &&
            (Math.abs(this.position.z - viewVector[2]) < this.bounds.z);
        var movingBackToCenter = (!(Math.abs(this.position.x) - this.bounds.x > 0) || (this.position.x > 0 ? (viewVector[0] >= 0) : (viewVector[0] <= 0))) &&
            (!(Math.abs(this.position.y) - this.bounds.y > 0) || (this.position.y > 0 ? (viewVector[1] >= 0) : (viewVector[1] <= 0) )) &&
            (!(Math.abs(this.position.z) - this.bounds.z > 0) || (this.position.z > 0 ? (viewVector[2] <= 0) : (viewVector[2] >= 0) ));
        if (!forward) {//Undo changes to view vector
            viewVector[0] = -1 * viewVector[0];
            viewVector[1] = -1 * viewVector[1];
            viewVector[2] = -1 * viewVector[2];
        }
        return wouldBeOutOfBounds || movingBackToCenter;
    };

    Viewer.prototype.rotateView = function (mouse, movedMouse, touch) {
        // Reduce movement on touch screens
        var movementScaleFactor = touch ? 4 : 1;

        if (!mouse.last) {
            mouse.last = mouse.start;
        } else {
            if (forward(mouse.start.x, mouse.last.x) != forward(mouse.last.x, movedMouse.x)) {
                mouse.start.x = mouse.last.x;
            }
            if (forward(mouse.start.y, mouse.last.y) != forward(mouse.last.y, movedMouse.y)) {
                mouse.start.y = mouse.last.y;
            }
        }

        this.horizontalRotation -= parseInt((mouse.start.x - movedMouse.x) / movementScaleFactor) / 200;
        this.verticalRotation -= parseInt((mouse.start.y - movedMouse.y) / movementScaleFactor) / 200;

        mouse.last.x = movedMouse.x;
        mouse.last.y = movedMouse.y;

        //Utility inner function
        function forward(v1, v2) {
            return v1 >= v2 ? true : false;
        }
    };

    /*
     * Model for the environment, includes lighting
     */
    var Environment = function () {
        this.bgColour = [0, 0, 0];
        this.alpha = 1;
        this.lighting = {
            ambient:[0.5, 0.5, 0.5],
            pointLightPosition:[-10, 4, -20],
            pointLightSpecular:[0.0, 0.0, 0.0],
            pointLightDiffuse:[0.0, 0.0, 0.0],
            specularHighlights:false,
            lighting:true
        };

        this.textures = true;
    };

    Environment.prototype.setupSceneForDraw = function (context) {
        if (context.state == '3D') {
            this.setupSceneForDraw3D(context);
        }
        else {
            this.setupSceneForDraw2D(context);
        }
    };

    Environment.prototype.setupSceneForDraw3D = function (context) {

        context.clearColor(this.bgColour[0], this.bgColour[1], this.bgColour[2], this.alpha);

        context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT);

        context.uniform1i(shaderProgram.showSpecularHighlightsUniform, this.lighting.specularHighlights);

        context.uniform1i(shaderProgram.useLightingUniform, this.lighting.lighting);

        if (this.lighting.lighting) {
            context.uniform3f(
                shaderProgram.ambientColorUniform,
                this.lighting.ambient[0],
                this.lighting.ambient[1],
                this.lighting.ambient[2]
            );

            /*context.uniform3f(
             shaderProgram.pointLightingLocationUniform,
             this.lighting.pointLightPosition[0],
             this.lighting.pointLightPosition[1],
             this.lighting.pointLightPosition[2]
             );

             context.uniform3f(
             shaderProgram.pointLightingSpecularColorUniform,
             this.lighting.pointLightSpecular[0],
             this.lighting.pointLightSpecular[1],
             this.lighting.pointLightSpecular[2]
             );

             context.uniform3f(
             shaderProgram.pointLightingDiffuseColorUniform,
             this.lighting.pointLightDiffuse[0],
             this.lighting.pointLightDiffuse[1],
             this.lighting.pointLightDiffuse[2]
             );*/
        }

        context.uniform1i(shaderProgram.useTexturesUniform, this.textures);
    };

    Environment.prototype.setupSceneForDraw2D = function (context) {
        if (this.alpha) {
            context.fillStyle = "rgba( " + this.bgColour[0] + "," + this.bgColour[1] + "," + this.bgColour[2] + "," + this.alpha + " )";
            context.fillRect(0, 0, context.canvasWidth, context.canvasHeight);
        }
        else {
            context.clearRect(0, 0, context.canvasWidth, context.canvasHeight)
        }

        context.scale(context.canvasWidth / 100, -context.canvasHeight / 100);
        context.translate(50, -50);
    };

    /*
     ** General Node model, both 2D and 3D
     */
    var Node = function () {
        this.position = {x:0, y:0, z:0};
        this.horizontalRotation = 0;
        this.allHorizontalRotation = true;
        this.verticalRotation = 0;
        this.allowVerticalRotation = true;
        this.animateActive = true;
        this.isVisible = true;

        this.children = [];
    };

    Node.prototype.draw = function (context, mvMatrix, pMatrix) {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);

        mat4.translate(mvMatrix, [this.position.x, this.position.y, this.position.z]);
        mat4.rotateY(mvMatrix, this.horizontalRotation);
        mat4.rotateX(mvMatrix, this.verticalRotation);

        for (i in this.children) {
            if (this.children[i].draw) {
                this.children[i].draw(context, mvMatrix, pMatrix);
            }
        }

        mat4.set(copy, mvMatrix);
    };

    Node.prototype.animate = function (time) {
        for (i in this.children) {
            this.children[i].animate && this.children[i].animate(time);
        }
    };

    Node.prototype.populatePickingPipeline = function (mvMatrix, pMatrix, pickingPipeline) {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);

        mat4.translate(mvMatrix, [this.position.x, this.position.y, this.position.z]);

        for (i in this.children) {
            if (this.children[i].populatePickingPipeline) {
                this.children[i].populatePickingPipeline(mvMatrix, pMatrix, pickingPipeline);
            }
        }

        mat4.set(copy, mvMatrix);
    };

    Node.prototype.rotate = function (mouse, movedMouse, touch) {
        // Reduce movement on touch screens
        var movementScaleFactor = touch ? 1 : 1;

        if (!mouse.last) {
            mouse.last = mouse.start;
        } else {
            if (forward(mouse.start.x, mouse.last.x) != forward(mouse.last.x, movedMouse.x)) {
                mouse.start.x = mouse.last.x;
            }
            if (forward(mouse.start.y, mouse.last.y) != forward(mouse.last.y, movedMouse.y)) {
                mouse.start.y = mouse.last.y;
            }
        }

        if (this.allHorizontalRotation) {
            this.horizontalRotation -= parseInt((mouse.start.x - movedMouse.x) / movementScaleFactor) / 200;
        }
        if (this.allowVerticalRotation) {
            this.verticalRotation -= parseInt((mouse.start.y - movedMouse.y) / movementScaleFactor) / 200;
        }

        mouse.last.x = movedMouse.x;
        mouse.last.y = movedMouse.y;

        //Utility inner function
        function forward(v1, v2) {
            return v1 >= v2 ? true : false;
        }
    };

    var Line = function () {
        this.endPosition = {x:0, y:0, z:0};
        this.state = "3D";
        this.opacity = 1;

        this.drawer = null;
    };

    Line.prototype = new Node;
    Line.prototype.constructor = Line;

    Line.prototype.setupForContext = function (context) {
        if (context.state == "3D") {
            this.drawer = null;
        }
        else {
            this.drawer = new LineDrawer2D();
        }
        this.state = context.state;
    };

    Line.prototype.draw = function (context, mvMatrix, pMatrix) {
        if (this.drawer && this.drawer.draw) {
            this.drawer.draw(this, context, mvMatrix, pMatrix);
        }
    };

    var Mesh = function () {
        this.endPosition = {x:0, y:0, z:0};
        this.state = "3D";
        this.fillStyle = 'white';
        this.opacity = 1;

        this.drawer = null;
    };

    Mesh.prototype = new Node;
    Mesh.prototype.constructor = Mesh;

    Mesh.prototype.setupForContext = function (context) {
        if (context.state == "3D") {
            this.drawer = null;
        }
        else {
            this.drawer = new MeshDrawer2D();
            this.drawingInformation = new MeshDrawingInformation2D();
        }
        this.state = context.state;
    };

    Mesh.prototype.setVertices = function (vertices) {
        this.drawingInformation.vertices = vertices;
    };

    Mesh.prototype.draw = function (context, mvMatrix, pMatrix) {
        if (this.drawer && this.drawer.draw) {
            this.drawer.draw(this, context, mvMatrix, pMatrix);
        }
    };

    var Sprite = function () {
        this.size = 1;
        this.label = "";
        this.shininess = 32;
        this.state = "3D";
        this.horizontalRotation = 0;
        this.verticalRotation = 0;
        this.opacity = 1;
        this.isLine = false;

        this.drawer = null;
        this.drawingInformation = null;
    };

    Sprite.prototype = new Node;
    Sprite.prototype.constructor = Sprite;

    Sprite.prototype.setupForContext = function (context) {
        if (context.state == "3D") {
            this.drawer = new Drawer3D();
            this.drawingInformation = new DrawingInformation3D();
        }
        else {
            this.drawer = new Drawer2D();
            this.drawingInformation = new DrawingInformation2D();
        }
        this.state = context.state;
    };

    Sprite.prototype.initialize = function (context, modelFile, imageFile) {
        //console.log( "In initialize root method" );
        if (this.state == "3D") {
            this.drawingInformation.initialize(context, modelFile, imageFile, this.size);
        }
        else {
            this.drawingInformation.initialize(imageFile);
        }
    };

    Sprite.prototype.draw = function (context, mvMatrix, pMatrix) {
        if (this.drawer && this.drawer.draw) {
            if (!this.drawingInformation) {
                //console.log( "this.drawingInformation null" );
                return;
            }
            this.drawer.draw(this, context, mvMatrix, pMatrix);
        }
    };

    Sprite.prototype.populatePickingPipeline = function (mvMatrix, pMatrix, pickingPipeline) {
        var position = calculateNDC(this.position, mvMatrix, pMatrix, true);

        var range = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z);
        if (position.z > 0 && this.isVisible) {
            pickingPipeline.push({
                position:position,
                size:this.size / position.z,
                range:range,
                entity:this});
        }
    };

    var Drawer3D = function () {
    };

    Drawer3D.prototype.draw = function (entity, context, mvMatrix, pMatrix) {

        if (!entity) return;

        var di = entity.drawingInformation;
        var position = [entity.position.x, entity.position.y, entity.position.z, 1];

        if (!di || !di.vertexPositionBuffer || !di.vertexNormalBuffer || !di.vertexTextureCoordBuffer || !di.vertexIndexBuffer) {
            return;
        }

        var copy = mat4.create();
        mat4.set(mvMatrix, copy);

        mat4.rotateY(mvMatrix, entity.horizontalRotation);
        mat4.rotateX(mvMatrix, entity.verticalRotation);
        mat4.translate(mvMatrix, position);

        context.bindBuffer(context.ARRAY_BUFFER, di.vertexPositionBuffer);
        context.vertexAttribPointer(shaderProgram.vertexPositionAttribute, di.vertexPositionBuffer.itemSize, context.FLOAT, false, 0, 0);

        context.bindBuffer(context.ARRAY_BUFFER, di.vertexTextureCoordBuffer);
        context.vertexAttribPointer(shaderProgram.textureCoordAttribute, di.vertexTextureCoordBuffer.itemSize, context.FLOAT, false, 0, 0);

        context.bindBuffer(context.ARRAY_BUFFER, di.vertexNormalBuffer);
        context.vertexAttribPointer(shaderProgram.vertexNormalAttribute, di.vertexNormalBuffer.itemSize, context.FLOAT, false, 0, 0);

        context.activeTexture(context.TEXTURE0);
        context.bindTexture(context.TEXTURE_2D, di.texture);
        context.uniform1i(shaderProgram.samplerUniform, 0);

        if (entity.opacity < 1) {
            mat4.multiplyVec4(mvMatrix, position);
            mat4.multiplyVec4(pMatrix, position);
            var range = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
            context.blendFunc(context.SRC_ALPHA, context.ONE);
            context.enable(context.BLEND);
            context.disable(context.DEPTH_TEST);
            context.uniform1f(shaderProgram.alphaUniform, parseFloat(entity.opacity * Math.max(0, (1 - range / 510))));
        } else {
            context.disable(context.BLEND);
            //context.enable(context.DEPTH_TEST);
        }

        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, di.vertexIndexBuffer);
        setMatrixUniforms();
        context.drawElements(context.TRIANGLES, di.vertexIndexBuffer.numItems, context.UNSIGNED_SHORT, 0);

        mat4.set(copy, mvMatrix);

        return;
    };

    var LineDrawer2D = function () {
    };

    LineDrawer2D.prototype.draw = function (entity, context, mvMatrix, pMatrix) {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);

        var startPosition = calculateNDC(entity.position, mvMatrix, pMatrix, false);
        var endPosition = calculateNDC(entity.endPosition, mvMatrix, pMatrix, true);

        if (startPosition.z > 0 && entity.isVisible) {
            renderPipeline2D.push({
                position:startPosition,
                entity:entity,
                vertices:[
                    endPosition
                ]
            });
        }

        mat4.set(copy, mvMatrix);
    };

    var MeshDrawer2D = function () {
    };

    MeshDrawer2D.prototype.draw = function (entity, context, mvMatrix, pMatrix) {

        var copy = mat4.create();
        mat4.set(mvMatrix, copy);

        var entityPosition = calculateNDC(entity.position, mvMatrix, pMatrix, false);
        var verticesNDC = [];
        if (entity.drawingInformation.renderMode == 'TRIANGLES' || entity.drawingInformation.renderMode == 'TRIANGLESTRIP') {
            for (var i = 0; i < entity.drawingInformation.vertices.length; i++) {
                verticesNDC.push(calculateNDC(entity.drawingInformation.vertices[i], mvMatrix, pMatrix));
            }
        }
        else if (entity.drawingInformation.renderMode == 'SHAPES') {
            for (var i = 0; i < entity.drawingInformation.vertices.length; i++) {
                var shapeVertices = [];
                for (var j = 0; j < entity.drawingInformation.vertices[i].length; j++) {
                    shapeVertices.push(calculateNDC(entity.drawingInformation.vertices[i][j], mvMatrix, pMatrix));
                }
                verticesNDC.push(shapeVertices);
            }
        }

        if (entityPosition.z > 0 && entity.isVisible) {
            renderPipeline2D.push({
                position:entityPosition,
                entity:entity,
                vertices:verticesNDC});//Passing NDC to drawer
        }

        mat4.set(copy, mvMatrix);
    };

    var Drawer2D = function () {
    };

    Drawer2D.prototype.draw = function (entity, context, mvMatrix, pMatrix) {
        var entityPosition = calculateNDC(entity.position, mvMatrix, pMatrix, true);

        if (entityPosition.z > 0 && entity.isVisible) {
            renderPipeline2D.push({
                position:entityPosition,
                entity:entity
            });
        }
    };

    var DrawingInformation3D = function () {
        this.vertexPositionBuffer = null;
        this.vertexNormalBuffer = null;
        this.vertexTextureCoordBuffer = null;
        this.vertexIndexBuffer = null;
        this.texture = null;
    };

    DrawingInformation3D.prototype.initialize = function (context, modelFile, textureImage, size) {
        var request = new XMLHttpRequest();
        request.open("GET", modelFile);
        var that = this;
        request.onreadystatechange = function () {
            if (request.readyState == 4) {

                var modelData = JSON.parse(request.responseText);
                that.resizeModel(modelData, size);

                that.vertexNormalBuffer = context.createBuffer();
                context.bindBuffer(context.ARRAY_BUFFER, that.vertexNormalBuffer);
                context.bufferData(context.ARRAY_BUFFER, new Float32Array(modelData.vertexNormals), context.STATIC_DRAW);
                that.vertexNormalBuffer.itemSize = 3;
                that.vertexNormalBuffer.numItems = modelData.vertexNormals.length / 3;

                that.vertexTextureCoordBuffer = context.createBuffer();
                context.bindBuffer(context.ARRAY_BUFFER, that.vertexTextureCoordBuffer);
                context.bufferData(context.ARRAY_BUFFER, new Float32Array(modelData.vertexTextureCoords), context.STATIC_DRAW);
                that.vertexTextureCoordBuffer.itemSize = 2;
                that.vertexTextureCoordBuffer.numItems = modelData.vertexTextureCoords.length / 2;

                that.vertexPositionBuffer = context.createBuffer();
                context.bindBuffer(context.ARRAY_BUFFER, that.vertexPositionBuffer);
                context.bufferData(context.ARRAY_BUFFER, new Float32Array(modelData.vertexPositions), context.STATIC_DRAW);
                that.vertexPositionBuffer.itemSize = 3;
                that.vertexPositionBuffer.numItems = modelData.vertexPositions.length / 3;

                that.vertexIndexBuffer = context.createBuffer();
                context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, that.vertexIndexBuffer);
                context.bufferData(context.ELEMENT_ARRAY_BUFFER, new Uint16Array(modelData.indices), context.STATIC_DRAW);
                that.vertexIndexBuffer.itemSize = 1;
                that.vertexIndexBuffer.numItems = modelData.indices.length;

                //console.log( "vertexPositionBuffer.numItems: " + that.vertexPositionBuffer.numItems );
                //console.log( "Model loaded" );
            }
        };
        request.send();

        this.initTexture(textureImage, context);

    };

    DrawingInformation3D.prototype.initTexture = function (textureImage, context) {
        this.texture = context.createTexture();

        if (!parseInt(textureImage) && !textureImage == 0) {
            //console.log('Setting texture from file');
            //textureImage is a file
            this.texture.image = new Image();
            var that = this;
            this.texture.image.onload = function () {
                context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
                context.bindTexture(context.TEXTURE_2D, that.texture);
                context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, that.texture.image);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
                context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
                //context.bindTexture(context.TEXTURE_2D, null);
                //console.log('Initialized texture: ' + this.texture.image.src );
            };
            this.texture.image.src = textureImage;
            //this.texture.image.src = 'marstexture.jpg';
        }
        else {
            //textureImage is an index in the video array
            this.texture.image = videos[textureImage].canvas;
            context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
            context.bindTexture(context.TEXTURE_2D, this.texture);
            context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, this.texture.image);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
            context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
        }
    };

    DrawingInformation3D.prototype.updateTexture = function () {
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
        context.bindTexture(context.TEXTURE_2D, that.texture);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, that.texture.image);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
    };

    DrawingInformation3D.prototype.resizeModel = function (modelData, size) {
        /*var maxRadius = 0;
         for (var i = 0; i < modelData.vertexPositions.length / 3; i++) {
         if (findDistance([0, 0, 0], [modelData.vertexPositions[i], modelData.vertexPositions[i + 1], modelData.vertexPositions[i + 2]]) > maxRadius) {
         maxRadius = findDistance([0, 0, 0], [modelData.vertexPositions[i], modelData.vertexPositions[i + 1], modelData.vertexPositions[i + 2]]);
         //console.log( "New max radius: " + maxRadius );
         }
         }*/
        for (i in modelData.vertexPositions) {
            modelData.vertexPositions[i] = size * modelData.vertexPositions[i] / 2;// / maxRadius;
        }
    };

    var DrawingInformation2D = function () {
        this.image = null;
        this.imageLoaded = false;
    };

    DrawingInformation2D.prototype.initialize = function (imageToLoad) {
        if (imageToLoad) {
            //this.image = document.getElementById(imageToLoad);
            if (!parseInt(imageToLoad) && !imageToLoad == 0) {
                this.image = new Image();
                this.image.src = imageToLoad;
                var that = this;
                this.image.onload = function () {
                    that.imageLoaded = true;
                };
            }
            else {
                this.image = document.getElementById(imageToLoad);
            }
        }
    };

    var MeshDrawingInformation2D = function () {
        this.vertices = [];
        this.renderMode = 'TRIANGLES';
    };

    /**
     * Public functional methods
     */

    var initCanvas = function (canvas, presetState) {
        if (presetState == '2D') {
            initCanvas2D(canvas);
            return;
        }

        initCanvas3D(canvas);

        if (!context) {
            state = '2D';
            initCanvas2D(canvas);
        }
    };

    var initShaders = function () {

        if (context.state == "2D") return;

        var fragmentShader = getShader(context, "shader-fs");
        var vertexShader = getShader(context, "shader-vs");

        shaderProgram = context.createProgram();
        context.attachShader(shaderProgram, vertexShader);
        context.attachShader(shaderProgram, fragmentShader);
        context.linkProgram(shaderProgram);

        if (!context.getProgramParameter(shaderProgram, context.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        context.useProgram(shaderProgram);

        shaderProgram.vertexPositionAttribute = context.getAttribLocation(shaderProgram, "aVertexPosition");
        context.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

        shaderProgram.textureCoordAttribute = context.getAttribLocation(shaderProgram, "aTextureCoord");
        context.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

        //shaderProgram.vertexNormalAttribute = context.getAttribLocation(shaderProgram, "aVertexNormal");
        //context.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

        shaderProgram.pMatrixUniform = context.getUniformLocation(shaderProgram, "uPMatrix");
        shaderProgram.mvMatrixUniform = context.getUniformLocation(shaderProgram, "uMVMatrix");
        //shaderProgram.nMatrixUniform = context.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.samplerUniform = context.getUniformLocation(shaderProgram, "uSampler");
        shaderProgram.alphaUniform = context.getUniformLocation(shaderProgram, "uAlpha");
    };

    var drawRenderPipeline2D = function (renderPipeline2D, viewer) {
        renderPipeline2D.sort(compareZ);
        context.fillStyle = 'white';

        for (var a = 0; a < renderPipeline2D.length; a++) {
            renderPipeline2D[a].entity.opacity = renderPipeline2D[a].entity.opacity || 1;
            //console.log( "Drawing entity at: " + renderPipeline2D[a].position.x + " " + renderPipeline2D[a].position.y + " with opacity: " + renderPipeline2D[a].entity.opacity);//" with image: " + renderPipeline2D[a][3].drawingInformation.image.src );
            context.save();

            //console.dir( renderPipeline2D[a] );
            context.globalAlpha = parseFloat(renderPipeline2D[a].entity.opacity);// * Math.max(0, 1 - renderPipeline2D[a].position.z / 500);
            var drawingInformation = renderPipeline2D[a].entity.drawingInformation;
            if (drawingInformation && (drawingInformation.image || drawingInformation.id)) {//Sprite
                var horizontalForeshorteningFactor = 1 - Math.tan(viewer.horizontalRotation);
                var verticalForeshorteningFactor = 1 - Math.tan(viewer.verticalRotation);
                context.translate(50 * renderPipeline2D[a].position.x, 50 * renderPipeline2D[a].position.y);
                context.scale(130 * horizontalForeshorteningFactor * renderPipeline2D[a].entity.size / renderPipeline2D[a].position.z, -130 * verticalForeshorteningFactor * renderPipeline2D[a].entity.size / renderPipeline2D[a].position.z);
                context.drawImage(drawingInformation.image, -1, -1, 2, 2);
            }
            else if (renderPipeline2D[a].vertices && renderPipeline2D[a].vertices.length == 1 && !(renderPipeline2D[a].vertices[0] instanceof Array)) {//Line
                context.lineWidth = 0.3;
                context.strokeStyle = renderPipeline2D[a].entity.strokeStyle || 'white';
                context.beginPath();
                context.moveTo(50 * renderPipeline2D[a].position.x, 50 * renderPipeline2D[a].position.y);
                context.lineTo(50 * renderPipeline2D[a].vertices[0].x, 50 * renderPipeline2D[a].vertices[0].y);
                context.stroke();
            }
            else if (renderPipeline2D[a].vertices && renderPipeline2D[a].vertices.length > 2 && drawingInformation.renderMode == 'TRIANGLESTRIP') {//Mesh
                for (var i = 2; i < renderPipeline2D[a].vertices.length; i++) {
                    context.beginPath();
                    context.lineTo(50 * renderPipeline2D[a].vertices[i - 2].x, 50 * renderPipeline2D[a].vertices[i - 2].y);
                    context.lineTo(50 * renderPipeline2D[a].vertices[i - 1].x, 50 * renderPipeline2D[a].vertices[i - 1].y);
                    context.lineTo(50 * renderPipeline2D[a].vertices[i].x, 50 * renderPipeline2D[a].vertices[i].y);
                    context.closePath();
                    context.fill();
                }
            }
            else if (renderPipeline2D[a].vertices && renderPipeline2D[a].vertices.length && drawingInformation.renderMode == 'TRIANGLES') {//Mesh
                for (var i = 2; i < renderPipeline2D[a].vertices.length; i += 3) {
                    context.beginPath();
                    context.lineTo(50 * renderPipeline2D[a].vertices[i - 2].x, 50 * renderPipeline2D[a].vertices[i - 2].y);
                    context.lineTo(50 * renderPipeline2D[a].vertices[i - 1].x, 50 * renderPipeline2D[a].vertices[i - 1].y);
                    context.lineTo(50 * renderPipeline2D[a].vertices[i].x, 50 * renderPipeline2D[a].vertices[i].y);
                    context.closePath();
                    context.fill();
                }
            }
            else if (renderPipeline2D[a].vertices && renderPipeline2D[a].vertices.length && drawingInformation.renderMode == 'SHAPES') {//Mesh
                context.strokeStyle = renderPipeline2D[a].entity.strokeStyle || 'white';
                context.fillStyle = renderPipeline2D[a].entity.fillStyle || 'white';
                for (var i = 0; i < renderPipeline2D[a].vertices.length; i++) {
                    context.moveTo(50 * renderPipeline2D[a].vertices[i][0].x, 50 * renderPipeline2D[a].vertices[i][0].y);
                    context.beginPath();
                    for (var j = 0; j < renderPipeline2D[a].vertices[i].length; j++) {
                        context.lineTo(50 * renderPipeline2D[a].vertices[i][j].x, 50 * renderPipeline2D[a].vertices[i][j].y);
                    }
                    context.closePath();
                    context.fill();
                }
            }
            context.restore();
        }
    };

    var canvasClicked = function (event) {
        event = event || window.event;
        var cursorXY = getCursorPosition(canvas, context.canvasWidth, context.canvasHeight, event);
        pickedItem = undefined;
        var pickingPipeline = new Array();
        sceneRoot.populatePickingPipeline(mvMatrix, pMatrix, pickingPipeline);
        pickingPipeline.sort(compareZ);
        for (var a in pickingPipeline) {
            //console.log( "Comparing: " + pickingPipeline[a].entity.label + " x: " + 50*pickingPipeline[a].x + " y: " + 50*pickingPipeline[a].y );
            //console.log( "Distance: " + findDistance( cursorXY, {x: 50*pickingPipeline[a].x, y: 50*pickingPipeline[a].y}) + " size: " + 150*pickingPipeline[a].size );

            if (findDistance(cursorXY, {x:50 * pickingPipeline[a].position.x, y:50 * pickingPipeline[a].position.y}) < 150 * pickingPipeline[a].size && pickingPipeline[a].entity.handleClick) {
                pickedItem = pickingPipeline[a].entity;
                break;
            }
        }
        if (pickedItem && pickedItem.handleClick) {
            var percentageCoordinatesOnClickedItem = {x:pickingPipeline[a].range * (cursorXY.x - 50 * pickingPipeline[a].x), y:pickingPipeline[a].range * (cursorXY.y - 50 * pickingPipeline[a].y) }
            pickedItem.handleClick(percentageCoordinatesOnClickedItem);
        }
        else {
            delete mouse.last;

            (event && event.touches) ? event = event.touches[0] : null;
            mouse.start.x = event.pageX;
            mouse.start.y = event.pageY;

            canvas.onmousemove = dragCanvas;
            canvas.ontouchmove = dragCanvas;
            canvas.onmouseup = unbindDragEvents;
            canvas.ontouchend = unbindDragEvents;
        }
        //Inner event handler functions
    };

    /**
     * Private methods below
     */

    var getShader = function (context, id) {
        if (context.state == '2D') {
            return;
        }

        var shaderScript = document.getElementById(id);

        if (!shaderScript) return null;

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = context.createShader(context.FRAGMENT_SHADER);
        }
        else if (shaderScript.type == "x-shader/x-vertex") {
            shader = context.createShader(context.VERTEX_SHADER);
        }
        else return null;

        context.shaderSource(shader, str);
        context.compileShader(shader);

        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            alert(context.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    };

    var canMoveForward = function () {
        var pickingPipeline = new Array();
        sceneRoot.populatePickingPipeline(mvMatrix, pMatrix, pickingPipeline);
        pickingPipeline.sort(compareZ);
        for (var a in pickingPipeline) {
            //console.dir(pickingPipeline[a]);
            if (pickingPipeline[a].range < 2.5 * pickingPipeline[a].size && pickingPipeline[a].z > 0 && !pickingPipeline[a].entity.ignoreCollisions) {
                console.log('Stopping forward');
                console.dir(pickingPipeline[a].entity);
                return 'noForward';
            }
            else if (pickingPipeline[a].range < 2.5 * pickingPipeline[a].size && pickingPipeline[a].z < 0 && !pickingPipeline[a].entity.ignoreCollisions) {
                console.log('stopping backward');
                return 'noBackward';
            }
        }
        return 'moveAllowed';
    };

    var initCanvas3D = function (canvas) {
        try {
            context = canvas.getContext('experimental-webgl');
            context.canvasWidth = canvas.width;
            context.canvasHeight = canvas.height;
            context.clearColor(0.0, 0.0, 0.0, 1.0);
            context.enable(context.DEPTH_TEST);
            context.state = '3D';
        } catch (e) {
        }
    };

    var initCanvas2D = function (canvasId) {
        try {
            canvas = document.getElementById(canvasId);
            //canvas.width = window.innerHeight;
            //canvas.height = window.innerHeight;
            context = canvas.getContext('2d');
            context.canvasWidth = canvas.width;
            context.canvasHeight = canvas.height;
            context.font = '7pt Arial';
            context.textBaseline = 'bottom';
            context.lineWidth = 0.2;
            context.fillStyle = 'white';
            context.strokeStyle = 'white';
            context.state = '2D';
        } catch (e) {
        }

        if (!context) {
            alert("Could not initialize 2D or 3D drawing");
            contextError = true;
        }
    };

    var calculateNDC = function (position, mvMatrix, pMatrix, resetMatrices) {
        if (resetMatrices) {
            var tmp = mat4.create();
            mat4.set(mvMatrix, tmp);
        }

        var position = [
            position.x,
            position.y,
            position.z,
            1
        ];
        mat4.multiplyVec4(mvMatrix, position);
        var vertexRange = Math.sqrt(position[0] * position[0] + position[1] * position[1] + position[2] * position[2]);
        mat4.multiplyVec4(pMatrix, position);

        if (resetMatrices) {
            mat4.set(tmp, mvMatrix);
        }

        return {x:position[0] / position[3], y:position[1] / position[3], z:vertexRange};
    };

    var findDistance = function (pos1, pos2) {
        var xDist = pos1.x - pos2.x;
        var yDist = pos1.y - pos2.y;
        return Math.sqrt(xDist * xDist + yDist * yDist);
    };

    var dragCanvas = function (event) {
        event = event || window.event;
        // Only perform rotation if one touch or mouse
        if (!touch || !(event && event.touches.length > 1)) {
            (event.preventDefault) ? event.preventDefault() : event.returnValue = false;
            event.touches ? event = event.touches[0] : null;
            sceneRoot.rotate(mouse, {x:event.pageX, y:event.pageY}, touch);
        }
    };

    var unbindDragEvents = function () {
        canvas.onmousemove = null;
        canvas.ontouchmove = null;
        canvas.onmouseup = null;
        canvas.ontouchend = null;
    };

    var setMatrixUniforms = function () {
        context.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        context.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    };

    var findPos = function (element) {
        return {left:parseFloat(element.offsetLeft), top:parseFloat(element.offsetTop)};
    };

    var getCursorPosition = function (canvas, canvasWidth, canvasHeight, event) {
        var x, y;

        var canOffset = findPos(canvas);
        x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - Math.floor(canOffset.left);
        x = x * 100 / canvasWidth - 50;
        y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop - Math.floor(canOffset.top);
        y = -y * 100 / canvasHeight + 50;

        return {x:x, y:y};
    };

    var compareZ = function (a, b) {
        return b.position.z - a.position.z;
    };

    return {
        Viewer:Viewer,
        Environment:Environment,
        Node:Node,
        Sprite:Sprite,
        Line:Line,
        Mesh:Mesh,
        initCanvas:initCanvas,
        initShaders:initShaders,
        drawRenderPipeline2D:drawRenderPipeline2D,
        canvasClicked:canvasClicked
    }
})();




