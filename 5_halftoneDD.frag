// Author: CMH
// Title: Improved CMYK Halftone with proper color mixing

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0;
uniform sampler2D u_tex1;

// Improved noise function
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Better halftone mask with dancing animation
float halftoneMask(vec2 uv, float val, float angle, float dotSpacing, float dotRadius) {
    // Rotation matrix
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 uv_rot = rot * (uv * u_resolution.xy / min(u_resolution.x, u_resolution.y));
    
    // Create grid
    vec2 grid = floor(uv_rot / dotSpacing) * dotSpacing + dotSpacing * 0.5;
    
    // Add dancing motion to each dot
    float noise = rand(grid);
    float timeOffset = noise * 6.28318; // 2*PI for varied timing
    
    // Circular dance motion
    vec2 danceOffset = vec2(
        sin(u_time * 2.0 + timeOffset) * dotSpacing * 0.3,
        cos(u_time * 2.5 + timeOffset) * dotSpacing * 0.3
    );
    
    // Apply dance offset to grid position
    vec2 dancingGrid = grid + danceOffset;
    float dist = length(uv_rot - dancingGrid);
    
    // Dynamic dot size with pulsing
    float pulse = 0.5 + 0.5 * sin(u_time * 3.0 + noise * 6.28318);
    float radius = dotRadius * sqrt(val) * (0.8 + 0.4 * pulse);
    
    // Smooth antialiased edges
    return 1.0 - smoothstep(radius - 0.002, radius + 0.002, dist);
}

// Convert RGB to CMYK
void rgbToCmyk(vec3 rgb, out float c, out float m, out float y, out float k) {
    k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
    float invK = 1.0 - k;
    
    if (invK < 0.001) {
        c = m = y = 0.0;
    } else {
        c = (1.0 - rgb.r - k) / invK;
        m = (1.0 - rgb.g - k) / invK;
        y = (1.0 - rgb.b - k) / invK;
    }
}

// Convert CMYK back to RGB (subtractive color model)
vec3 cmykToRgb(float c, float m, float y, float k) {
    float r = (1.0 - c) * (1.0 - k);
    float g = (1.0 - m) * (1.0 - k);
    float b = (1.0 - y) * (1.0 - k);
    return vec3(r, g, b);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 uv = st;
    
    // Sample original texture
    vec3 color = texture2D(u_tex0, uv).rgb;
    
    // Optional: Add color tint (remove or adjust as needed)
    // color = mix(color, vec3(0.5, 0.0, 1.0), 0.2); // Subtle purple tint
    
    // Convert to CMYK
    float c, m, y, k;
    rgbToCmyk(color, c, m, y, k);
    
    // Halftone parameters
    float dotSpacing = 0.015; // Slightly larger for better visibility
    float dotRadius = 0.008;
    
    // Classic CMYK screen angles to minimize moiré
    float angleC = radians(15.0);
    float angleM = radians(75.0);
    float angleY = radians(0.0);
    float angleK = radians(45.0);
    
    // Generate halftone masks for each channel
    float maskC = halftoneMask(uv, c, angleC, dotSpacing, dotRadius);
    float maskM = halftoneMask(uv, m, angleM, dotSpacing, dotRadius);
    float maskY = halftoneMask(uv, y, angleY, dotSpacing, dotRadius);
    float maskK = halftoneMask(uv, k, angleK, dotSpacing, dotRadius);
    
    // Method 1: Proper subtractive color mixing (more realistic printing)
    vec3 finalColor = cmykToRgb(
        c * maskC,
        m * maskM,
        y * maskY,
        k * maskK
    );
    
    // Method 2: Artistic overlay (uncomment to use instead)
    // vec3 paper = vec3(1.0); // White paper
    // paper *= (1.0 - maskC * c * vec3(1.0, 0.0, 0.0)); // Subtract cyan
    // paper *= (1.0 - maskM * m * vec3(0.0, 1.0, 0.0)); // Subtract magenta
    // paper *= (1.0 - maskY * y * vec3(0.0, 0.0, 1.0)); // Subtract yellow
    // paper *= (1.0 - maskK * k);                        // Subtract black
    // vec3 finalColor = paper;
    
    // Optional: Add paper texture
    float paperNoise = rand(uv * 100.0) * 0.03;
    finalColor += paperNoise;
    
    // Optional: Increase contrast
    finalColor = pow(finalColor, vec3(0.9));
    
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
}