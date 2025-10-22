// Basic 2D Perlin-like noise (value noise with gradient hashing)

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform int u_patternType; // 0: lava, 1: clouds, 2: marble, 3: wood, 4: camo


// Hash function that returns a pseudo-random gradient vector in [-1,1]
vec2 hash2(vec2 p) {
	p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
	return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Smooth interpolation (Perlin's fade)
vec2 fade(vec2 t) {
	return t * t * (3.0 - 2.0 * t);
}

// 2D Perlin-like noise: gradients at grid corners + smooth interpolation
float perlinNoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);

	// gradients at corners
	vec2 g00 = hash2(i + vec2(0.0, 0.0));
	vec2 g10 = hash2(i + vec2(1.0, 0.0));
	vec2 g01 = hash2(i + vec2(0.0, 1.0));
	vec2 g11 = hash2(i + vec2(1.0, 1.0));

	// offsets from corners
	vec2 d00 = f - vec2(0.0, 0.0);
	vec2 d10 = f - vec2(1.0, 0.0);
	vec2 d01 = f - vec2(0.0, 1.0);
	vec2 d11 = f - vec2(1.0, 1.0);

	// dot products
	float v00 = dot(g00, d00);
	float v10 = dot(g10, d10);
	float v01 = dot(g01, d01);
	float v11 = dot(g11, d11);

	// interpolate
	vec2 u = fade(f);
	float nx0 = mix(v00, v10, u.x);
	float nx1 = mix(v01, v11, u.x);
	float nxy = mix(nx0, nx1, u.y);
	return nxy;
}

// Fractional Brownian Motion (fbm) for richer noise (optional)
float fbm(vec2 p) {
	float value = 0.0;
	float amplitude = 1.0;
	float frequency = 2.0;
	for (int i = 0; i < 4; i++) {
		value += amplitude * perlinNoise(p * frequency);
		frequency *= 2.0;
		amplitude *= 0.5;
	}
	return value;
}


// Lava pattern: animated fiery colors
vec3 lavaPattern(vec2 uv) {
	float scale = 5.0;
	float n = fbm(uv * scale + vec2(u_time * 0.3, u_time * 0.1));
	float t = smoothstep(0.2, 0.8, n * 0.5 + 0.5);
	vec3 col = mix(vec3(0.1, 0.0, 0.0), vec3(1.0, 0.5, 0.0), t); // dark red to orange
	col = mix(col, vec3(1.0, 1.0, 0.0), pow(t, 3.0)); // add yellow highlights
	return col;
}

// Clouds pattern: soft white/blue
vec3 cloudsPattern(vec2 uv) {
	float scale = 3.0;
	float n = fbm(uv * scale + vec2(u_time * 0.05));
	float t = clamp(n * 0.5 + 0.5, 0.0, 1.0);
	vec3 col = mix(vec3(0.6, 0.8, 1.0), vec3(1.0), pow(t, 1.5)); // blue sky to white
	return col;
}

// Marble pattern: sine-warped fbm
vec3 marblePattern(vec2 uv) {
	float scale = 6.0;
	float n = fbm(uv * scale);
	float m = sin((uv.x + n * 1.5) * 10.0 + u_time * 0.2);
	float t = clamp(m * 0.5 + 0.5, 0.0, 1.0);
	vec3 col = mix(vec3(0.9, 0.9, 1.0), vec3(0.5, 0.5, 0.6), t); // white to blue-gray
	return col;
}

// Wood pattern: radial rings using fbm
vec3 woodPattern(vec2 uv) {
	float scale = 8.0;
	vec2 center = vec2(0.5, 0.5);
	float r = length(uv - center);
	float n = fbm(uv * scale);
	float rings = sin((r + n * 0.2) * 30.0);
	float t = clamp(rings * 0.5 + 0.5, 0.0, 1.0);
	vec3 col = mix(vec3(0.4, 0.2, 0.05), vec3(0.8, 0.6, 0.2), t); // dark to light brown
	return col;
}

// Camouflage pattern: layered thresholded fbm
vec3 camoPattern(vec2 uv) {
	float scale = 5.0;
	float n1 = fbm(uv * scale);
	float n2 = fbm(uv * (scale * 0.7) + 10.0);
	float n3 = fbm(uv * (scale * 1.3) - 20.0);
	float t1 = step(0.2, n1);
	float t2 = step(0.0, n2);
	float t3 = step(-0.1, n3);
	vec3 col = vec3(0.2, 0.3, 0.1); // base green
	col = mix(col, vec3(0.5, 0.4, 0.2), t1); // brown
	col = mix(col, vec3(0.1, 0.1, 0.1), t2); // black
	col = mix(col, vec3(0.3, 0.5, 0.2), t3); // light green
	return col;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // If your runtime sets u_mouse.x=0 when not pressed, this works out of the box
    float mx = (u_mouse.x <= 0.0) ? 0.0 : u_mouse.x / u_resolution.x;
    int mode = int(floor(clamp(mx, 0.0, 0.999) * 5.0)); // 0..4

    vec3 col;
    if (mode == 0) {
        col = lavaPattern(uv);
    } else if (mode == 1) {
        col = cloudsPattern(uv);
    } else if (mode == 2) {
        col = marblePattern(uv);
    } else if (mode == 3) {
        col = woodPattern(uv);
    } else {
        col = camoPattern(uv);
    }

    gl_FragColor = vec4(col, 1.0);
}