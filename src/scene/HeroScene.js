import {
  ACESFilmicToneMapping, Box3, Color, FrontSide, Group, LinearMipmapLinearFilter,
  Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  Scene, ShaderMaterial, SRGBColorSpace, Texture, TextureLoader, Vector2, Vector3, WebGLRenderer,
} from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { getSceneTier } from "./tier.js";
import { CAMERA_FOV, CAMERA_Y, visibleWorldHeight, swing, narrowFit, narrowDrop } from "./fit.js";
import { DEFAULT_PARAMS } from "./params.js";

const HEAD_HEIGHT = 5.4;
const HELMET_WORN_OFFSET = new Vector3(0, -0.56, 0.35);
const STATIC_POSE = { x: 0.3, y: 0.1 };

const headVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const headFragment = /* glsl */ `
  uniform sampler2D uDiffuse;
  uniform sampler2D uDepth;
  uniform sampler2D uAlpha;
  uniform sampler2D uNormal;
  uniform vec2 uParallax;
  uniform float uDepthScale;
  uniform float uRelight;
  varying vec2 vUv;
  void main() {
    float depth = texture2D(uDepth, vUv).r;
    vec2 offset = uParallax * (depth - 0.5) * uDepthScale;
    vec2 uv = vUv + offset;
    vec4 color = texture2D(uDiffuse, uv);
    float alpha = texture2D(uAlpha, uv).r;

    vec3 normal = normalize(texture2D(uNormal, uv).rgb * 2.0 - 1.0);
    vec3 lightDir = normalize(vec3(uParallax * 1.6, 1.0));
    float lambert = max(dot(normal, lightDir), 0.0) - 0.72;
    vec3 lit = color.rgb * (1.0 + lambert * uRelight);

    gl_FragColor = vec4(clamp(lit, 0.0, 1.0), alpha);
    #include <colorspace_fragment>
  }
`;

// Injected into the helmet's own PBR material: a soft circular mask that
// follows the cursor, unioned with the entrance's own dissolve-to-mask curve.
function injectRevealMask(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec4 vRevealClip;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvRevealClip = gl_Position;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
         varying vec4 vRevealClip;
         uniform vec2 uMouseNdc;
         uniform float uAspect;
         uniform float uRadius;
         uniform float uEdge;
         uniform float uIntro;
         uniform float uBurnStart;`
      )
      .replace(
        "#include <alphamap_fragment>",
        `#include <alphamap_fragment>
         vec2 ndc = vRevealClip.xy / vRevealClip.w;
         vec2 a = vec2(ndc.x * uAspect, ndc.y);
         vec2 b = vec2(uMouseNdc.x * uAspect, uMouseNdc.y);
         float dist = length(a - b);
         float pointerMask = 1.0 - smoothstep(uRadius, uRadius + uEdge, dist);
         float introFront = smoothstep(uBurnStart, 1.0, uIntro);
         float introMask = 1.0 - introFront;
         float mask = max(pointerMask, introMask);
         diffuseColor.a *= mask;`
      );
  };
}

export class HeroScene {
  constructor(canvas, { assetsBase, onReady, onError }) {
    this.assetsBase = assetsBase;
    this.onReady = onReady;
    this.onError = onError;
    this.params = { ...DEFAULT_PARAMS };
    this._tier = getSceneTier();

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
    this.camera.position.set(0, CAMERA_Y, this.params.cameraZ);

    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: this._tier.antialias });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._tier.maxDpr));
    this.renderer.toneMapping = ACESFilmicToneMapping;

    this.helmetPivot = new Group();
    this.helmetGroup = new Group();
    this.helmetGroup.add(this.helmetPivot);
    this.subjectGroup = new Group();
    this.subjectGroup.add(this.helmetGroup);
    this.scene.add(this.subjectGroup);

    this.pointer = { ...STATIC_POSE };
    this.smoothed = { ...STATIC_POSE };
    this.pointerSeen = false;
    this.tilt = 0;
    this.yaw = 0;
    this.aspect = 1;
    this.viewportHeight = 1;

    this.riseStarted = false;
    this.riseAt = null;
    this.readyAt = null;
    this.intro = 0;
    this.ready = false;
    this.disposed = false;
    this.startTime = null;

    if (!this._tier.pointerEnabled) this.parkPointer();

    this.revealUniforms = {
      uMouseNdc: { value: new Vector2(this.smoothed.x, -this.smoothed.y) },
      uAspect: { value: 1 },
      uRadius: { value: this.params.revealRadius },
      uEdge: { value: this.params.revealEdge },
      uIntro: { value: 0 },
      uBurnStart: { value: this.params.burnStart },
    };

    void this.load();
  }

  get tier() { return this._tier; }

  parkPointer() {
    this.pointer = { ...STATIC_POSE };
    this.smoothed = { ...STATIC_POSE };
    this.pointerSeen = false;
  }

  retune() {
    const fresh = getSceneTier();
    this._tier = { ...fresh, antialias: this._tier.antialias };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._tier.maxDpr));
    if (!this._tier.pointerEnabled) this.parkPointer();
    return this._tier;
  }

  beginRise() { this.riseStarted = true; }

  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (!this.pointerSeen) {
      this.pointerSeen = true;
      this.smoothed.x = x;
      this.smoothed.y = y;
    }
  }

  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.viewportHeight = Math.max(height, 1);
    this.aspect = width / height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.revealUniforms.uAspect.value = this.aspect;
  }

  update(time) {
    if (this.disposed) return;
    if (this.startTime === null) this.startTime = time;
    const t = (time - this.startTime) / 1000;
    const p = this.params;

    if (this.ready) {
      if (this.readyAt === null) this.readyAt = t;
      this.intro = this._tier.freeze ? 1 : Math.min(1, (t - this.readyAt) / p.introDuration);
    }

    this.smoothed.x += (this.pointer.x - this.smoothed.x) * p.pointerLerp;
    this.smoothed.y += (this.pointer.y - this.smoothed.y) * p.pointerLerp;

    const riseOffset = this.riseOffset(t, p);
    this.subjectGroup.scale.setScalar(p.subjectScale * narrowFit(this.aspect));
    this.subjectGroup.position.x = p.subjectX + this.smoothed.x * p.subjectParallax;
    this.subjectGroup.position.y = p.subjectY - narrowDrop(this.aspect) - this.smoothed.y * p.subjectParallax - riseOffset;

    if (this.headMaterial) {
      this.headMaterial.uniforms.uParallax.value.set(this.smoothed.x, -this.smoothed.y);
      this.headMaterial.uniforms.uDepthScale.value = p.headParallax;
      this.headMaterial.uniforms.uRelight.value = p.headRelight;
    }
    if (this.headMesh) {
      this.headMesh.scale.setScalar(p.headScale);
      this.headMesh.position.y = -0.55 + p.headY;
    }

    this.tilt += (swing(this.smoothed.y, p.helmetAmpX, p.helmetCurveX) - this.tilt) * p.pointerLerp;
    this.yaw += (swing(this.smoothed.x, p.helmetAmpY, p.helmetCurveY) - this.yaw) * p.pointerLerp;
    this.helmetPivot.rotation.x = this.tilt;
    this.helmetPivot.rotation.y = this.yaw;
    this.helmetGroup.position.set(
      p.helmetX + this.smoothed.x * p.helmetFollow,
      p.helmetY - this.smoothed.y * p.helmetFollow * 0.8,
      p.helmetZ
    );
    this.helmetGroup.scale.setScalar(p.helmetScale);
    this.shellMaterial?.color.setScalar(p.helmetBrightness);

    this.revealUniforms.uMouseNdc.value.set(this.smoothed.x, -this.smoothed.y);
    this.revealUniforms.uRadius.value = p.revealRadius;
    this.revealUniforms.uEdge.value = p.revealEdge;
    this.revealUniforms.uIntro.value = this.intro;
    this.revealUniforms.uBurnStart.value = p.burnStart;

    this.renderer.render(this.scene, this.camera);
  }

  riseOffset(t, p) {
    if (this._tier.freeze || p.riseDistance === 0) return 0;
    let remaining = 1;
    if (this.riseStarted) {
      if (this.riseAt === null) this.riseAt = t;
      const u = Math.min(1, (t - this.riseAt) / p.riseDuration);
      remaining = 1 - (1 - (1 - u) * (1 - u));
    }
    if (remaining <= 0) return 0;
    const visible = visibleWorldHeight(p.cameraZ);
    return remaining * p.riseDistance * (visible / this.viewportHeight);
  }

  async load() {
    try {
      const base = `${this.assetsBase}/hero/scene`;
      const textureLoader = new TextureLoader();
      const loadTexture = (file, srgb = false) =>
        new Promise((resolve, reject) => {
          textureLoader.load(
            `${base}/${file}`,
            (texture) => {
              if (srgb) texture.colorSpace = SRGBColorSpace;
              texture.minFilter = LinearMipmapLinearFilter;
              texture.generateMipmaps = true;
              resolve(texture);
            },
            undefined,
            () => reject(new Error(`${base}/${file}`))
          );
        });

      // No setDecoderPath: keeps the WASM/JS decoder same-origin (bundled by Vite) instead of a third-party CDN.
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderConfig({ type: "wasm" }); // never fetch the large JS-fallback decoder
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      const [env, diffuse, depth, alpha, normal, gltf] = await Promise.all([
        new RGBELoader().loadAsync(`${base}/studio-light.hdr`).catch(() => { throw new Error(`${base}/studio-light.hdr`); }),
        loadTexture("person-diffuse.webp", true),
        loadTexture("person-depth.webp"),
        loadTexture("person-alpha.webp"),
        loadTexture("person-normal.webp"),
        gltfLoader.loadAsync(`${base}/helmet3.glb`).catch(() => { throw new Error(`${base}/helmet3.glb`); }),
      ]);
      if (this.disposed) return;

      const pmrem = new PMREMGenerator(this.renderer);
      this.scene.environment = pmrem.fromEquirectangular(env).texture;
      env.dispose();
      pmrem.dispose();

      this.buildHead(diffuse, depth, alpha, normal);
      this.buildHelmet(gltf.scene);

      for (const texture of [diffuse, depth, alpha, normal]) this.renderer.initTexture(texture);
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.disposed) return;
      this.renderer.render(this.scene, this.camera);

      this.ready = true;
      this.onReady?.();
    } catch (error) {
      this.onError?.(error.message ?? String(error));
    }
  }

  buildHead(diffuse, depth, alpha, normal) {
    this.headMaterial = new ShaderMaterial({
      vertexShader: headVertex,
      fragmentShader: headFragment,
      uniforms: {
        uDiffuse: { value: diffuse },
        uDepth: { value: depth },
        uAlpha: { value: alpha },
        uNormal: { value: normal },
        uParallax: { value: new Vector2() },
        uDepthScale: { value: DEFAULT_PARAMS.headParallax },
        uRelight: { value: DEFAULT_PARAMS.headRelight },
      },
      transparent: true,
    });
    const geometry = new PlaneGeometry(HEAD_HEIGHT, HEAD_HEIGHT);
    this.headMesh = new Mesh(geometry, this.headMaterial);
    this.headMesh.position.set(0, -0.55, 0);
    this.subjectGroup.add(this.headMesh);
  }

  buildHelmet(root) {
    root.traverse((object) => {
      if (!object.isMesh) return;
      const mesh = object;
      const shell = mesh.material;
      shell.side = FrontSide;
      shell.transparent = true;
      shell.depthWrite = false;
      shell.envMapIntensity = 1.3;
      injectRevealMask(shell, this.revealUniforms);
      mesh.renderOrder = 1;
      this.shellMaterial = shell;
    });

    const bounds = new Box3().setFromObject(root);
    const size = bounds.getSize(new Vector3());
    const scale = (HEAD_HEIGHT * 0.56) / size.y;
    root.scale.setScalar(scale);
    bounds.setFromObject(root);
    const center = bounds.getCenter(new Vector3());
    root.position.sub(center);
    this.helmetPivot.position.copy(HELMET_WORN_OFFSET);
    this.helmetPivot.add(root);
  }

  dispose() {
    this.disposed = true;
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (!material) continue;
        for (const value of Object.values(material)) {
          if (value instanceof Texture) value.dispose();
        }
        material.dispose();
      }
    });
    this.renderer.dispose();
  }
}
