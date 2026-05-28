use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hello_from_wasm() -> String {
  "Hello from Rust/WASM!".to_string()
}
