class DynamicMap extends EventListener {
    /**
     * Creates new Dynamic Map
     * @param {HTMLElement} root Root element to place Map
     * @param {String} texture Path to texture of the Map
     * @param {Vector} centerOffset Offset from center of texture
     * @param {Object} options Create map with initial settings
     * @returns {DynamicMap} New Dynamic Map
     */
    constructor(root, texture, centerOffset, options) {
        super();
        this.root = root;
        this.element = null;
        this.texture = texture;
        this.offset = centerOffset;

        this.image = new Image();
        this.image.src = this.texture;
        this.image.onload = () => {
            this.createMap();
            this.addListeners();
            this.updateTransform();
            this.dispatchEvent("load");
        }

        this.width = options.width || 800;
        this.height = options.height || 800;

        this.scaleAlpha = options.scale || 1;
        this.position = options.center || new Vector(0, 0);

        this.isDraging = false;
        this.mousePosition = new Vector();
        this.mousePositionPrev = new Vector();

        this.tip = null;
        this.objects = [];
        this.groups = [];
    }
    removeMap() {
        this.element.remove();
        delete this;
    }
    createMap() {
        var style = `.map {
			position: relative;
			width: 700px;
			height: 700px;
			background: gray;
			color: white;
		}
		.map .view {
			position: relative;
			height: 100%;
			width: 100%;
			overflow: hidden;
		}

		.map .tip {
			position: absolute;
			top: 0;
			left: 0;
			padding: 3px;
			opacity: 0;
			font-size: 14px;
			text-align: center;
			background-color: #202020;
			border-radius: 3px;
			z-index: 10;
		}
		.map .tip::after {
			content: "";
			position: absolute;
			top: 100%; /* At the bottom of the tooltip */
			left: 50%;
			margin-left: -5px;
			border: 5px solid transparent;
			border-top-color: #202020;
		  }

		.map .dot {
			position: absolute;
			top: 50%;
			left: 50%;
			width: 2px;
			height: 2px;
			opacity: 0.8;
			background-color: #ff1e00;
			transform: translate(-50%, -50%);
			z-index: 1;
		}

		.map .view .texture {
			position: relative;
			image-rendering: pixelated;
			transition: .25s;
		}
		.map .view .texture .map-object {
			position: absolute !important;
			top: 2064px !important;
			left: 2064px !important;
			opacity: 0.75;
			cursor: pointer;
			transition: opacity .25s, transform .25s;
		}
		.map .view .texture .map-object:hover {
			opacity: 0.9;
			z-index: 50;
		}

		.map aside {
			--width: 20%;
			position: fixed;
			top: 0;
			right: calc(var(--width) * -1);
			height: 100%;
			width: var(--width);
			background-color: rgba(0, 0, 0, 0.5);
			transition: .25s;
		}
		.map aside.active {
			right: 0;
		}
		.map aside .button {
			--margin: 15px;
			--width: 45px;
			position: absolute;
			height: var(--width);
			width: var(--width);
			top: var(--margin);
			left: calc(-1 * (var(--width) + var(--margin)));
			background-color: rgba(0, 0, 0, 0.5);
			border-radius: 50%;
			padding: 12px 10px;
			cursor: pointer;
			opacity: 0.5;
			transition: .25s;
		}
		.map aside .button:hover {
			opacity: 1;
		}
		.map aside .button div {
			width: 25px;
			height: 4px;
			background-color: white;
			border-radius: 2px;
		}
		.map aside .button div:nth-child(2) {
			margin: 4px 0;
		}
		.map aside .groups {
			margin: 50px 20px;
		}
		.map aside .group {
			margin-bottom: 15px;
		}
		.map aside .group.hidden {
			display: none;
		}
		.map aside .header {
			border-bottom: 1px solid #696969;
			padding: 1px 4px;
			font-size: 12px;
		}
		.map aside .items {
			margin: 5px 0 10px;
			padding: 0 5px;
		}
		.map aside .item {
			display: flex;
			align-items: center;
			margin: 8px 0;
			cursor: pointer;
			padding: 6px;
			border-radius: 2px;
			transition: 0.25s;
		}
		.map aside .item:hover {
			background-color: rgba(0, 0, 0, 0.25);
		}
		.map aside .item.active {
			pointer-events: none;
			background-color: rgba(255, 255, 255, 0.2);
		}
		.map aside .icon {
			width: 32px;
			height: 32px;
			background-color: #707888;
			background-image: var(--url);
			background-position: center;
			background-repeat: no-repeat;
			background-size: contain;
			image-rendering: pixelated;
		}
		.map aside .label {
			margin: 0 10px;
		}
		.map aside .name {
			font-size: 15px;
		}
		.map aside .desc {
			font-size: 12px;
			opacity: 0.75;
			padding: 1px 0;
		}

		.map .panel {
			position: absolute;
			display: flex;
			justify-content: space-between;
			width: 100%;
			bottom: 0;
			padding: 5px;
			font-size: 18px;
			background: #424242;
		}
		.map .panel .left {
			text-align: left;
		}
		.map .panel .right {
			text-align: right;
		}
		.map .panel button {
			width: 20px;
			height: 20px;
		}

		/* Default Map Objects */
		.map .view .texture .map-object.marker .icon {
			display: inline-block;
			width: 12px;
    		height: 12px;
			/*border-radius: 50%;*/
			border: 8px solid var(--color);
			box-sizing: content-box;
			border-radius: 50% 50% 50% 0;
			transform: rotate(-45deg);
		}`;

        var w = this.image.width;
        var h = this.image.height;

        var originX = w / 2 + this.offset.x;
        var originY = h / 2 + this.offset.y;

        var html = `<div class="map" style="width:${this.width}px;height:${this.height}px">
			<style>${style}</style>
			<div class="dot"></div>
			<div class="tip"></div>
			<div class="view">
				<div class="texture" style="background-image:url(${this.texture});width:${w}px;height:${h}px;left:${-(originX - this.width / 2)}px;top:${-(originY - this.height / 2)}px;"></div>
			</div>
			<aside>
				<div class="button">
					<div></div>
					<div></div>
					<div></div>
				</div>
				<div class="groups"></div>
			</aside>
			<div class="panel">
				<div class="left">
					<div class="coords cursor">X: 0 Z: 0</div>
					<div class="control"><button class="center"></button> <button class="zoom-in"></button> <button class="zoom-out"></button></div>
				</div>
				<div class="right">
					<div class="coords center">X: 0 Z: 0</div>
					<div class="options"><input type="checkbox" checked> Auto Sharp <input type="checkbox" checked> Auto Adjust</div>
				</div>
			</div>
		</div>`;

        this.element = this.root.appendChild(parseHTML(html));
        this.tip = get(this.element, ".tip");
        get(this.element, "aside .button").onclick = e => toggleClass(get(this.element, "aside"), "active");
    }
    translate(position, time) {
        this.position = position;

        if(time) {
            get(this.element, ".texture").style.transition = time + "ms";
            setTimeout(() => get(this.element, ".texture").style.transition = ".25s");
        }
        this.updateTransform();

        this.dispatchEvent("translate", { value: this.position });
    }
    scale(a, time) {
        this.scaleAlpha = a;

        if(this.scaleAlpha < 0.07) this.scaleAlpha = 0.07;
        if(this.scaleAlpha > 2) this.scaleAlpha = 2;

        get(this.element, ".texture").style.imageRendering = this.scaleAlpha < 0.5 ? "auto" : "pixelated";

        if(time) {
            get(this.element, ".texture").style.transition = time + "ms";
            setTimeout(() => get(this.element, ".texture").style.transition = ".25s");
        }
        this.updateTransform();

        this.dispatchEvent("scale", { value: this.scaleAlpha });
    }
    zoom(state) {
        this.scale(this.scaleAlpha += state ? this.scaleAlpha / 5 : -this.scaleAlpha / 5);
    }
    updateTransform() {
        get(this.element, ".texture").style.transform = `scale(${this.scaleAlpha}) translate(${-this.position.x}px, ${-this.position.y}px)`;
        this.updateCoords();
    }
    updateCoords() {
        var x = (this.position.x) + (this.mousePosition.x - this.width / 2) * (1 / this.scaleAlpha);
        var z = (this.position.y) + (this.mousePosition.y - this.height / 2) * (1 / this.scaleAlpha);

        get(this.element, ".coords.cursor").innerHTML = `X: ${Math.round(x)} Z: ${Math.round(z)}`;
        get(this.element, ".coords.center").innerHTML = `X: ${Math.round(this.position.x)} Z: ${Math.round(this.position.y)}`;
    }
    addListeners() {
        var view = get(this.element, ".view");
        view.onwheel = e => {
            this.zoom(e.deltaY < 0);
        };

        view.onmousedown = e => {
            this.isDraging = true;
            this.mousePositionPrev = new Vector(e.clientX, e.clientY);
            get(this.element, ".view").style.cursor = "move";
            get(this.element, ".texture").style.transition = "none";
        };
        view.onmouseup = e => {
            this.isDraging = false;
            get(this.element, ".view").style.cursor = "default";
            get(this.element, ".texture").style.transition = ".25s";
        };
        view.onmousemove = e => {
            this.mousePosition = new Vector(e.clientX, e.clientY);
            this.updateCoords();

            if(!this.isDraging) return;

            var d = new Vector(this.mousePosition.x - this.mousePositionPrev.x, this.mousePosition.y - this.mousePositionPrev.y).mult(1 / this.scaleAlpha);

            this.translate(new Vector(this.position.x - d.x, this.position.y - d.y));

            this.mousePositionPrev = this.mousePosition;
        }

        this.on("scale", e => {
            for(var object of this.objects) {
                object.updateTransform();
                object.dispatchEvent("scale", { value: this.scaleAlpha });
            }

            /*var pairs = [];
            for(var o1 of this.objects) {
                for(var o2 of this.objects) {
                    if(o1 == o2 || (!o1.merge || !o2.merge)) continue;

                    var coll = COLLISION.rectangle(o1.position, getElementDimensions(o1.element), o2.position, getElementDimensions(o2.element));

                    if(coll) pairs.push([o1, o2]);
                }
			}
			
			var groups = [];
			if(pairs.length) groups.push([]);
			for(var pair of pairs) {
				for(var group of groups) {
					if(group.indexOf(pair[0]) > -1) 
				}
			}*/
        });
        this.on("translate", e => {
            for(var object of this.objects) {
                object.dispatchEvent("translate", { value: this.position });
            }
        });
    }
    createMarker(position, color = "orange", text = "Marker") {
        var object = new MapObject(parseHTML(`<div class="marker" style="--color:${color}" tip="${text}<br>X: ${~~position.x} Z: ${~~position.y}${text ? "<br>" + text : ""}"><div class="icon"></div></div>`), position, false);
        this.attachObject(object);
        object.setTransform("translate(-50%, -100%)");
        return object;
    }
    attachObject(object) {
        if(!(object instanceof MapObject)) throw new TypeError("object is not instance of MapObject!");

        object.map = this;
        object.updateTransform();
        this.objects.push(object);

        get(this.element, ".texture").appendChild(object.element);
        return object;
    }
    attachGroup(group) {
        if(!(group instanceof MapGroup)) throw new TypeError("group is not instance of MapGroup!");

        group.map = this;
        this.groups.push(group);

        get(this.element, "aside .groups").appendChild(group.element);
        return group;
    }
}


class MapObject extends EventListener {
    constructor(element, position, scaling = true, merge = false) {
        super();
        this.element = element;
        this.position = position;
        this.scaling = scaling;
        this.merge = merge;

        this.transform = "";

        toggleClass(this.element, "map-object", true);

        this.element.onmouseenter = e => {
            var tip = this.element.getAttribute("tip");

            if(!tip) return;

            var pos = getElementPosition(this.element);
            var dim = getElementDimensions(this.element);

            this.map.tip.innerHTML = tip;

            this.map.tip.style.opacity = 1;
            this.map.tip.style.left = pos.x + "px";
            this.map.tip.style.top = pos.y + "px";
            this.map.tip.style.transform = `translate(${-this.map.tip.clientWidth/2 + dim.w/2}px, -120%) translateZ(0)`;
        }

        this.element.onmouseleave = e => {
            var tip = this.element.getAttribute("tip");
            if(!tip) return;

            this.map.tip.style.opacity = 0;
            this.map.tip.style.left = "0px";
            this.map.tip.style.top = "0px";

            this.map.tip.innerHTML = "";
        }

        this.element.onclick = e => {
            this.dispatchEvent("click", { event: e }, e => {
                this.map.translate(this.position, 1000);
                if(this.map.scaleAlpha < 1) this.map.scale(1, 1000);
            });
        }
    }
    setTransform(transform) {
        this.transform = transform;
        this.updateTransform();
    }
    updateTransform() {
        var scale = this.map.scaleAlpha;
        var s = `scale(${1 / scale}) translate(${(1 - scale) * 50}%, ${(1 - scale) * 50}%)`;
        this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px) ${this.scaling ? "" : s} ${this.transform} translateZ(0)`;
    }
    setPosition(position) {
        this.position = position;
        this.updateTransform();
    }
    destroy() {
        this.map.objects.splice(this.map.objects.indexOf(this), 1);
        this.element.remove();
    }
}

class MapGroup extends EventListener {
    constructor(name) {
        super();
        this.name = name;
        this.items = [];
        this.selected = null;
        this.createGroup()
    }
    createGroup() {
        var html = `<div class="group hidden">
			<div class="header">${this.name}</div>
			<div class="items"></div>
		</div>`;
        this.element = parseHTML(html);
    }
    attachItem(item) {
        if(!(item instanceof MapItem)) throw new TypeError("item is not instance of MapItem!");

        item.map = this.map;
        item.group = this;
        this.items.push(item);
        get(this.element, ".items").appendChild(item.element);
        toggleClass(this.element, "hidden", false);

        return item;
    }
    destroy() {
        this.map.groups.splice(this.map.groups.indexOf(this), 1);
        this.element.remove();
    }
}

class MapItem extends EventListener {
    constructor(name, description, icon) {
        super();
        this.name = name;
        this.description = description;
        this.icon = icon;
        this.createItem();
    }
    createItem() {
        var html = `<div class="item">
			<div class="icon" style="--url: url(${this.icon})"></div>
			<div class="label">
				<div class="name">${this.name}</div>
				<div class="desc">${this.description}</div>
			</div>
		</div>`;
        this.element = parseHTML(html);
        this.element.addEventListener("click", e => {
            this.dispatchEvent("click", { event: e });
        });
    }
    destroy() {
        this.group.items.splice(this.group.items.indexOf(this), 1);
        this.element.remove();
        if(!this.group.items.length) toggleClass(this.group.element, "hidden", true);
    }
    select() {
        if(this.group.selected) toggleClass(this.group.selected.element, "active", false);
        toggleClass(this.element, "active", true);
        this.group.selected = this;
    }
}