use wasm_bindgen::prelude::*;

const PALETTE: [[u8; 3]; 24] = [
    [255, 255, 255],
    [25, 25, 25],
    [190, 190, 190],
    [120, 120, 120],
    [230, 45, 45],
    [245, 130, 35],
    [255, 210, 35],
    [60, 170, 75],
    [0, 125, 70],
    [40, 180, 190],
    [35, 110, 210],
    [85, 65, 180],
    [160, 60, 180],
    [235, 90, 165],
    [245, 175, 185],
    [125, 80, 45],
    [220, 165, 110],
    [245, 220, 175],
    [40, 55, 90],
    [90, 150, 210],
    [110, 190, 135],
    [200, 220, 110],
    [240, 125, 100],
    [175, 145, 120],
];

#[wasm_bindgen]
pub fn bead_pattern(
    pixels: &[u8],
    source_width: u32,
    source_height: u32,
    columns: u32,
    rows: u32,
    available_colors: &[u8],
) -> Result<Vec<u8>, JsValue> {
    bead_pattern_pixels(
        pixels,
        source_width,
        source_height,
        columns,
        rows,
        available_colors,
    )
    .map_err(JsValue::from_str)
}

#[wasm_bindgen]
pub fn bead_palette() -> Vec<u8> {
    PALETTE.iter().flatten().copied().collect()
}

fn bead_pattern_pixels(
    pixels: &[u8],
    source_width: u32,
    source_height: u32,
    columns: u32,
    rows: u32,
    available_colors: &[u8],
) -> Result<Vec<u8>, &'static str> {
    if source_width == 0
        || source_height == 0
        || source_width > 1600
        || source_height > 1600
        || columns == 0
        || rows == 0
        || columns > 200
        || rows > 200
    {
        return Err(
            "Image dimensions must be between 1 and 1600 and pattern dimensions between 1 and 200.",
        );
    }

    let expected = (source_width as usize)
        .checked_mul(source_height as usize)
        .and_then(|pixels| pixels.checked_mul(4))
        .ok_or("Image dimensions are too large.")?;
    if pixels.len() != expected {
        return Err("Pixel data does not match the source dimensions.");
    }
    if available_colors.is_empty() || available_colors.len() % 3 != 0 {
        return Err("Select at least one complete bead color.");
    }
    let palette: Vec<[u8; 3]> = available_colors
        .chunks_exact(3)
        .map(|color| [color[0], color[1], color[2]])
        .collect();

    let mut pattern = Vec::with_capacity(columns as usize * rows as usize * 4);
    for row in 0..rows {
        for column in 0..columns {
            let (red, green, blue) = average_region(
                pixels,
                source_width,
                source_height,
                column,
                row,
                columns,
                rows,
            );
            let color = nearest_color([red, green, blue], &palette);
            pattern.extend_from_slice(&[color[0], color[1], color[2], 255]);
        }
    }

    Ok(pattern)
}

fn average_region(
    pixels: &[u8],
    width: u32,
    height: u32,
    column: u32,
    row: u32,
    columns: u32,
    rows: u32,
) -> (u8, u8, u8) {
    let x_start = column * width / columns;
    let x_end = ((column + 1) * width / columns).max(x_start + 1).min(width);
    let y_start = row * height / rows;
    let y_end = ((row + 1) * height / rows).max(y_start + 1).min(height);
    let mut totals = [0u64; 3];
    let mut count = 0u64;

    for y in y_start..y_end {
        for x in x_start..x_end {
            let index = ((y * width + x) * 4) as usize;
            let alpha = u64::from(pixels[index + 3]);
            for channel in 0..3 {
                totals[channel] +=
                    (u64::from(pixels[index + channel]) * alpha + 255 * (255 - alpha)) / 255;
            }
            count += 1;
        }
    }

    (
        (totals[0] / count) as u8,
        (totals[1] / count) as u8,
        (totals[2] / count) as u8,
    )
}

fn nearest_color(color: [u8; 3], palette: &[[u8; 3]]) -> [u8; 3] {
    *palette
        .iter()
        .min_by_key(|candidate| {
            let red = i32::from(color[0]) - i32::from(candidate[0]);
            let green = i32::from(color[1]) - i32::from(candidate[1]);
            let blue = i32::from(color[2]) - i32::from(candidate[2]);
            (red * red * 3 + green * green * 4 + blue * blue * 2) as u32
        })
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_sampled_pixels_to_opaque_palette_colors() {
        let result = bead_pattern_pixels(&[250, 10, 10, 255], 1, 1, 1, 1, &[230, 45, 45]).unwrap();
        assert_eq!(result, [230, 45, 45, 255]);
    }

    #[test]
    fn rejects_invalid_dimensions_and_pixel_buffers() {
        let palette: Vec<u8> = PALETTE.iter().flatten().copied().collect();
        assert!(bead_pattern_pixels(&[], 1, 1, 0, 1, &palette).is_err());
        assert!(bead_pattern_pixels(&[], 1, 1, 1, 1, &palette).is_err());
        assert!(bead_pattern_pixels(&[], 1, 1, 201, 1, &palette).is_err());
        assert!(bead_pattern_pixels(&[], u32::MAX, u32::MAX, 1, 1, &palette).is_err());
    }

    #[test]
    fn averages_source_pixels_before_selecting_a_bead_color() {
        let source = [255, 255, 255, 255, 25, 25, 25, 255];
        let palette: Vec<u8> = PALETTE.iter().flatten().copied().collect();
        let result = bead_pattern_pixels(&source, 2, 1, 1, 1, &palette).unwrap();
        assert_eq!(result, [120, 120, 120, 255]);
    }

    #[test]
    fn limits_bead_colors_to_the_selected_palette() {
        let result = bead_pattern_pixels(&[255, 255, 255, 255], 1, 1, 1, 1, &[25, 25, 25]).unwrap();
        assert_eq!(result, [25, 25, 25, 255]);
        assert!(bead_pattern_pixels(&[0, 0, 0, 255], 1, 1, 1, 1, &[]).is_err());
        assert!(bead_pattern_pixels(&[0, 0, 0, 255], 1, 1, 1, 1, &[1, 2]).is_err());
    }
}
