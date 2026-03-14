let sharp;

try {
    sharp = (await import("sharp")).default;
} catch {
    sharp = (await import("@img/sharp-wasm")).default;
}

export default sharp;