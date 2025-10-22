// Basic 2D Perlin-like noise (value noise with gradient hashing)
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

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

void main() {
	vec2 uv = gl_FragCoord.xy / u_resolution.xy;

	// scale controls the "zoom" of the noise
	float scale = 3.0;

	// sample fbm with a time-based offset for animation
	float n = fbm(uv * scale + vec2(u_time * 0.1));

	// perlinNoise/fbm produces values roughly in the range [-0.5,0.5]
	// remap to [0,1]
	float noise = clamp(n * 0.5 + 0.5, 0.0, 1.0);

	// output grayscale noise
	vec3 col = vec3(noise);
	gl_FragColor = vec4(col, 1.0);
}
