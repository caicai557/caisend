#[cfg(feature = "cpp")]
#[cfg(not(target_os = "macos"))]
fn main() {
    cc::Build::new()
        .cpp(true)
        .flag("-std=c++11")
        // Force dynamic CRT to avoid /MT vs /MD mismatches with downstream dynamic libs.
        .static_crt(false)
        .file("src/esaxx.cpp")
        .include("src")
        .compile("esaxx");
}

#[cfg(feature = "cpp")]
#[cfg(target_os = "macos")]
fn main() {
    cc::Build::new()
        .cpp(true)
        .flag("-std=c++11")
        .flag("-stdlib=libc++")
        // Force dynamic CRT to avoid /MT vs /MD mismatches with downstream dynamic libs.
        .static_crt(false)
        .file("src/esaxx.cpp")
        .include("src")
        .compile("esaxx");
}

#[cfg(not(feature = "cpp"))]
fn main() {}
