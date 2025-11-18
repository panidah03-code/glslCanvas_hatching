// 20200220_glsl Genetic Face_v0.frag
// Title: Genetic Face - Multi-Target Morphing

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

#define iTime u_time
#define iResolution u_resolution
#define fragCoord gl_FragCoord.xy

uniform sampler2D u_tex0; //data/old.jpg
uniform sampler2D u_tex1; //data/new.jpg
uniform sampler2D u_buffer0; // Previous frame (Current State)

//==================PASS A
#if defined(BUFFER_0)

#define EVERY_PIXEL_SAME_COLOR
#define CIRCLES

float Random_Final(vec2 uv, float seed) {
    float fixedSeed = abs(seed) + 1.;
    float x = dot(uv, vec2(12.9898, 78.233) * fixedSeed);
    return fract(sin(x) * 43758.5453);
}

bool pointInCircle(vec2 center, float radius, vec2 testPoint) {
    return distance(testPoint, center) < radius;
}

void main() {
    vec2 imageUV = fragCoord.xy / iResolution.xy;
    vec2 testUV = imageUV;

    #ifdef EVERY_PIXEL_SAME_COLOR
    testUV = vec2(1., 1.);
    #endif

    // --- TIMING LOGIC FOR MULTI-TARGET ---
    float timePerImage = 25.0; // Switch image every 20 seconds
    
    // Calculate "Local Time" (counts 0 to 20, then resets to 0)
    float localTime = mod(u_time, timePerImage);
    float phase = floor(u_time / timePerImage);

    // --- Random Position (Mutation location) ---
    vec2 tp1 = vec2(Random_Final(testUV, iTime + phase),       Random_Final(testUV, iTime * 2.0 + phase));
    vec2 tp2 = vec2(Random_Final(testUV, iTime * 3.0 + phase), Random_Final(testUV, iTime * 4.0 + phase));
    vec2 tp3 = vec2(Random_Final(testUV, iTime * 5.0 + phase), Random_Final(testUV, iTime * 6.0 + phase));
    vec2 center = (tp1 + tp2 + tp3) / 3.0;

    // --- SCALING LOGIC: BIG TO SMALL (RESETTING) ---
    float progress = clamp(localTime / timePerImage, 0.0, 1.0);
    float inverseProgress = 1.0 - progress;
    float sizeCurve = pow(inverseProgress, 2.0);

    float startSize = 1.5;
    float endSize = 0.005;
    
    float rnd = Random_Final(testUV, 99.0 + phase);
    float currentMaxSize = mix(endSize, startSize, sizeCurve);
    float s = mix(endSize, currentMaxSize, rnd);


    // --- Color Generation (Mutation color) ---
    vec4 testColor = vec4(
        Random_Final(testUV, iTime * 10.),
        Random_Final(testUV, iTime * 11.),
        Random_Final(testUV, iTime * 12.),
        1.
    );

    // --- TARGET SELECTION ---
    vec4 trueColor;
    if (mod(phase, 2.0) == 0.0) {
        trueColor = texture2D(u_tex0, imageUV); // Target 1
    } else {
        trueColor = texture2D(u_tex1, imageUV); // Target 2
    }

    vec4 prevColor = texture2D(u_buffer0, imageUV);
    gl_FragColor = prevColor;

    // --- Shape Test ---
    bool isInside = false;

    #ifdef CIRCLES
    float radius = s * 0.20; 
    isInside = pointInCircle(center, radius, imageUV);
    #endif

    // --- GENETIC ALGORITHM CORE ---
    if (isInside) {
        
        // 1. FITNESS FUNCTION (Error Calculation)
        // Measure the distance/error in color space (Euclidean distance on RGB vectors)
        float prevDiff = abs(length(trueColor - prevColor)); // Current Error
        float testDiff = abs(length(trueColor - testColor)); // Proposed Error
        
        // The Score is the fitness value: Improvement = Old_Error - New_Error
        // If score > 0, the mutation is "fitter" (it's closer to the target color).
        float score = prevDiff - testDiff;

        // 2. SELECTION RULE (Acceptance/Rejection)
        // Only accept the mutation (the new circle's color) if it improves the fit.
        if (score > 0.) {
            gl_FragColor = testColor; // Selection Rule: ACCEPT (The new color is "fitter")
        } else {
            // Rejection: The change is not made, and gl_FragColor remains prevColor.
        }
    }
}

#else
//==================Main Pass
void main() {
    vec2 uv = fragCoord / iResolution.xy;
    gl_FragColor = texture2D(u_buffer0, uv);
}
#endif