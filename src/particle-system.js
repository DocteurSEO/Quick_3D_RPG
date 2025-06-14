import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118.1/build/three.module.js';

export const particle_system = (() => {

  const _VS = `
  uniform float pointMultiplier;
  
  attribute float size;
  attribute float angle;
  attribute vec4 colour;
  
  varying vec4 vColour;
  varying vec2 vAngle;
  
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * pointMultiplier / gl_Position.w;
  
    vAngle = vec2(cos(angle), sin(angle));
    vColour = colour;
  }`;
  
  const _FS = `
  
  uniform sampler2D diffuseTexture;
  
  varying vec4 vColour;
  varying vec2 vAngle;
  
  void main() {
    vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
    gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
  }`;
  
  
  class LinearSpline {
    constructor(lerp) {
      this._points = [];
      this._lerp = lerp;
    }
  
    AddPoint(t, d) {
      this._points.push([t, d]);
    }
  
    Get(t) {
      let p1 = 0;
  
      for (let i = 0; i < this._points.length; i++) {
        if (this._points[i][0] >= t) {
          break;
        }
        p1 = i;
      }
  
      const p2 = Math.min(this._points.length - 1, p1 + 1);
  
      if (p1 == p2) {
        return this._points[p1][1];
      }
  
      return this._lerp(
          (t - this._points[p1][0]) / (
              this._points[p2][0] - this._points[p1][0]),
          this._points[p1][1], this._points[p2][1]);
    }
  }
  
  
  class ParticleSystem {
    constructor(params) {
      // Optimisations de performance
      this._maxParticles = 2000; // Augmenté pour plus d'effets visuels
      this._sortFrequency = 1; // Tri chaque frame pour la qualité maximale
      this._frameCounter = 0;
      
      const uniforms = {
          diffuseTexture: {
              value: new THREE.TextureLoader().load(params.texture)
          },
          pointMultiplier: {
              value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
          }
      };
  
      this._material = new THREE.ShaderMaterial({
          uniforms: uniforms,
          vertexShader: _VS,
          fragmentShader: _FS,
          blending: THREE.AdditiveBlending,
          depthTest: true,
          depthWrite: false,
          transparent: true,
          vertexColors: true
      });
  
      this._camera = params.camera;
      this._particles = [];
  
      this._geometry = new THREE.BufferGeometry();
      this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
      this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
      this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
      this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));
  
      this._points = new THREE.Points(this._geometry, this._material);
  
      params.parent.add(this._points);
  
      this._alphaSpline = new LinearSpline((t, a, b) => {
        return a + t * (b - a);
      });
  
      this._colourSpline = new LinearSpline((t, a, b) => {
        const c = a.clone();
        return c.lerp(b, t);
      });
  
      this._sizeSpline = new LinearSpline((t, a, b) => {
        return a + t * (b - a);
      });
  
      this._UpdateGeometry();
    }
  
    AddParticles(origin, n) {
      // Limiter le nombre total de particules
      if (this._particles.length + n > this.MAX_PARTICLES) {
        n = Math.max(0, this.MAX_PARTICLES - this._particles.length);
      }
      
      if (n <= 0) return;
      
      for (let i = 0; i < n; i++) {
        const life = (Math.random() * 0.75 + 0.25) * 3.0;
        const p = new THREE.Vector3(
            (Math.random() * 2 - 1) * 1.0,
            (Math.random() * 2 - 1) * 1.0,
            (Math.random() * 2 - 1) * 1.0);
        const d = p.clone().normalize().multiplyScalar(15);
        p.add(origin);
        this._particles.push({
            position: p,
            size: (Math.random() * 0.5 + 0.5) * 4.0,
            colour: new THREE.Color(),
            alpha: 1.0,
            life: life,
            maxLife: life,
            rotation: Math.random() * 2.0 * Math.PI,
            velocity: d,
        });
      }
    }
  
    _UpdateGeometry() {
      const positions = [];
      const sizes = [];
      const colours = [];
      const angles = [];
  
      for (let p of this._particles) {
        positions.push(p.position.x, p.position.y, p.position.z);
        colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
        sizes.push(p.currentSize);
        angles.push(p.rotation);
      }
  
      this._geometry.setAttribute(
          'position', new THREE.Float32BufferAttribute(positions, 3));
      this._geometry.setAttribute(
          'size', new THREE.Float32BufferAttribute(sizes, 1));
      this._geometry.setAttribute(
          'colour', new THREE.Float32BufferAttribute(colours, 4));
      this._geometry.setAttribute(
          'angle', new THREE.Float32BufferAttribute(angles, 1));
    
      this._geometry.attributes.position.needsUpdate = true;
      this._geometry.attributes.size.needsUpdate = true;
      this._geometry.attributes.colour.needsUpdate = true;
      this._geometry.attributes.angle.needsUpdate = true;
    }
  
    _UpdateParticles(timeElapsed) {
      // Optimisation: utiliser un tableau pour les particules à supprimer
      const particlesToRemove = [];
      
      for (let i = 0; i < this._particles.length; i++) {
        const p = this._particles[i];
        p.life -= timeElapsed;
        
        if (p.life <= 0) {
          particlesToRemove.push(i);
          continue;
        }
        
        // Optimiser les calculs
        const t = 1.0 - p.life / p.maxLife;
        p.rotation += timeElapsed * 0.5;
        p.alpha = this._alphaSpline.Get(t);
        p.currentSize = p.size * this._sizeSpline.Get(t);
        p.colour.copy(this._colourSpline.Get(t));
        
        // Réduire les clones d'objets - modification directe
        p.position.x += p.velocity.x * timeElapsed;
        p.position.y += p.velocity.y * timeElapsed;
        p.position.z += p.velocity.z * timeElapsed;
        
        // Optimiser le calcul de la traînée
        const dragFactor = timeElapsed * 2.0;
        p.velocity.x *= (1 - Math.min(dragFactor, 1));
        p.velocity.y *= (1 - Math.min(dragFactor, 1));
        p.velocity.z *= (1 - Math.min(dragFactor, 1));
      }
      
      // Supprimer les particules mortes (en ordre inverse)
      for (let i = particlesToRemove.length - 1; i >= 0; i--) {
        this._particles.splice(particlesToRemove[i], 1);
      }
      
      // Calcul de distance précis pour haute performance
      for (let particle of this._particles) {
        const distance = particle.position.distanceTo(this._camera.position);
        particle.distanceToCamera = distance;
      }
      
      if (this._frameCounter++ % this._sortFrequency === 0) {
        this._particles.sort((a, b) => {
          return b.distanceToCamera - a.distanceToCamera;
        });
      }
    }
  
    Step(timeElapsed) {
      this._UpdateParticles(timeElapsed);
      this._UpdateGeometry();
    }
  }

  return {
    ParticleSystem: ParticleSystem,
  };
})();