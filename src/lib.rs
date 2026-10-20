use wasm_bindgen::prelude::*;

const PALETTE: [(u16, [u8; 3]); 85] = [
    (1, [229, 236, 241]),
    (2, [228, 228, 197]),
    (3, [233, 199, 4]),
    (4, [209, 72, 3]),
    (5, [180, 6, 14]),
    (6, [234, 138, 165]),
    (7, [113, 34, 151]),
    (8, [2, 57, 163]),
    (9, [2, 91, 195]),
    (10, [2, 118, 67]),
    (11, [25, 205, 167]),
    (12, [62, 39, 26]),
    (13, [192, 36, 53]),
    (14, [228, 170, 50]),
    (15, [72, 126, 213]),
    (16, [55, 184, 118]),
    (17, [131, 143, 152]),
    (18, [20, 19, 21]),
    (19, [216, 210, 206]),
    (20, [141, 42, 15]),
    (21, [190, 108, 33]),
    (22, [145, 2, 10]),
    (24, [104, 62, 154]),
    (26, [232, 164, 152]),
    (27, [220, 177, 142]),
    (28, [30, 44, 28]),
    (29, [191, 1, 66]),
    (30, [78, 12, 27]),
    (31, [72, 154, 185]),
    (43, [231, 228, 90]),
    (44, [249, 97, 96]),
    (45, [142, 105, 205]),
    (46, [81, 174, 228]),
    (47, [128, 223, 150]),
    (48, [214, 122, 209]),
    (49, [15, 172, 209]),
    (60, [240, 152, 30]),
    (61, [217, 147, 80]),
    (62, [72, 71, 74]),
    (63, [66, 49, 47]),
    (70, [165, 179, 192]),
    (71, [68, 80, 89]),
    (72, [240, 151, 176]),
    (73, [89, 174, 245]),
    (74, [91, 85, 189]),
    (75, [183, 140, 109]),
    (76, [138, 89, 55]),
    (77, [206, 209, 200]),
    (78, [247, 193, 170]),
    (79, [248, 118, 51]),
    (82, [145, 23, 90]),
    (83, [3, 122, 159]),
    (84, [104, 120, 54]),
    (95, [221, 155, 163]),
    (96, [180, 145, 173]),
    (97, [138, 175, 194]),
    (98, [148, 204, 164]),
    (101, [169, 195, 155]),
    (102, [53, 107, 45]),
    (103, [255, 230, 96]),
    (104, [188, 209, 34]),
    (105, [255, 172, 120]),
    (106, [204, 197, 237]),
    (107, [106, 135, 193]),
    (108, [42, 37, 54]),
    (109, [138, 132, 127]),
    (110, [131, 137, 86]),
    (111, [131, 88, 84]),
    (112, [173, 138, 130]),
    (113, [95, 136, 123]),
    (114, [154, 44, 49]),
    (115, [110, 151, 95]),
    (116, [34, 40, 56]),
    (117, [119, 113, 105]),
    (118, [97, 41, 50]),
    (119, [65, 103, 180]),
    (64, [239, 235, 228]),
    (32, [255, 32, 141]),
    (34, [229, 239, 19]),
    (35, [255, 40, 51]),
    (36, [35, 83, 176]),
    (37, [6, 183, 60]),
    (38, [253, 134, 0]),
    (55, [250, 248, 237]),
    (56, [237, 191, 159]),
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
    PALETTE
        .iter()
        .flat_map(|(_, color)| color)
        .copied()
        .collect()
}

#[wasm_bindgen]
pub fn bead_palette_codes() -> Vec<u16> {
    PALETTE.iter().map(|(code, _)| *code).collect()
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
    let palette_oklab: Vec<[f64; 3]> = palette.iter().copied().map(srgb_to_oklab).collect();

    let mut pattern = Vec::with_capacity(columns as usize * rows as usize * 4);
    for row in 0..rows {
        for column in 0..columns {
            let color = sample_region(
                pixels,
                source_width,
                source_height,
                column,
                row,
                columns,
                rows,
            );
            let color = nearest_color(color, &palette, &palette_oklab);
            pattern.extend_from_slice(&[color[0], color[1], color[2], 255]);
        }
    }

    Ok(pattern)
}

fn sample_region(
    pixels: &[u8],
    width: u32,
    height: u32,
    column: u32,
    row: u32,
    columns: u32,
    rows: u32,
) -> [u8; 3] {
    let x_start = f64::from(column) * f64::from(width) / f64::from(columns);
    let x_end = f64::from(column + 1) * f64::from(width) / f64::from(columns);
    let y_start = f64::from(row) * f64::from(height) / f64::from(rows);
    let y_end = f64::from(row + 1) * f64::from(height) / f64::from(rows);
    let mut totals = [0.0; 3];
    let mut total_weight = 0.0;

    for y in y_start.floor() as u32..y_end.ceil() as u32 {
        let overlap_y = y_end.min(f64::from(y + 1)) - y_start.max(f64::from(y));
        for x in x_start.floor() as u32..x_end.ceil() as u32 {
            let overlap_x = x_end.min(f64::from(x + 1)) - x_start.max(f64::from(x));
            let weight = overlap_x * overlap_y;
            let index = ((y * width + x) * 4) as usize;
            let alpha = f64::from(pixels[index + 3]) / 255.0;
            for channel in 0..3 {
                let color = srgb_to_linear(f64::from(pixels[index + channel]) / 255.0);
                totals[channel] += weight * (color * alpha + 1.0 - alpha);
            }
            total_weight += weight;
        }
    }

    totals.map(|total| (linear_to_srgb(total / total_weight) * 255.0).round() as u8)
}

fn nearest_color(color: [u8; 3], palette: &[[u8; 3]], palette_oklab: &[[f64; 3]]) -> [u8; 3] {
    let color_oklab = srgb_to_oklab(color);
    *palette
        .iter()
        .zip(palette_oklab)
        .min_by(|(_, left), (_, right)| {
            oklab_distance_squared(color_oklab, **left)
                .total_cmp(&oklab_distance_squared(color_oklab, **right))
        })
        .map(|(color, _)| color)
        .unwrap()
}

fn srgb_to_linear(value: f64) -> f64 {
    if value <= 0.04045 {
        value / 12.92
    } else {
        ((value + 0.055) / 1.055).powf(2.4)
    }
}

fn linear_to_srgb(value: f64) -> f64 {
    if value <= 0.0031308 {
        value * 12.92
    } else {
        1.055 * value.powf(1.0 / 2.4) - 0.055
    }
}

fn srgb_to_oklab(color: [u8; 3]) -> [f64; 3] {
    let red = srgb_to_linear(f64::from(color[0]) / 255.0);
    let green = srgb_to_linear(f64::from(color[1]) / 255.0);
    let blue = srgb_to_linear(f64::from(color[2]) / 255.0);

    let lightness =
        (0.412_221_470_8 * red + 0.536_332_536_3 * green + 0.051_445_992_9 * blue).cbrt();
    let green_blue =
        (0.211_903_498_2 * red + 0.680_699_545_1 * green + 0.107_396_956_6 * blue).cbrt();
    let blue_red =
        (0.088_302_461_9 * red + 0.281_718_837_6 * green + 0.629_978_700_5 * blue).cbrt();

    [
        0.210_454_255_3 * lightness + 0.793_617_785 * green_blue - 0.004_072_046_8 * blue_red,
        1.977_998_495_1 * lightness - 2.428_592_205 * green_blue + 0.450_593_709_9 * blue_red,
        0.025_904_037_1 * lightness + 0.782_771_766_2 * green_blue - 0.808_675_766 * blue_red,
    ]
}

fn oklab_distance_squared(left: [f64; 3], right: [f64; 3]) -> f64 {
    (left[0] - right[0]).powi(2) + (left[1] - right[1]).powi(2) + (left[2] - right[2]).powi(2)
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
        let palette: Vec<u8> = PALETTE
            .iter()
            .flat_map(|(_, color)| color)
            .copied()
            .collect();
        assert!(bead_pattern_pixels(&[], 1, 1, 0, 1, &palette).is_err());
        assert!(bead_pattern_pixels(&[], 1, 1, 1, 1, &palette).is_err());
        assert!(bead_pattern_pixels(&[], 1, 1, 201, 1, &palette).is_err());
        assert!(bead_pattern_pixels(&[], u32::MAX, u32::MAX, 1, 1, &palette).is_err());
    }

    #[test]
    fn samples_source_pixels_in_linear_light() {
        let source = [255, 255, 255, 255, 25, 25, 25, 255];
        let result =
            bead_pattern_pixels(&source, 2, 1, 1, 1, &[188, 188, 188, 120, 120, 120]).unwrap();
        assert_eq!(result, [188, 188, 188, 255]);
    }

    #[test]
    fn weights_pixels_by_their_covered_area() {
        let source = [0, 0, 0, 255, 255, 255, 255, 255];
        let result = bead_pattern_pixels(
            &source,
            2,
            1,
            3,
            1,
            &[0, 0, 0, 188, 188, 188, 255, 255, 255],
        )
        .unwrap();
        assert_eq!(&result[4..8], &[188, 188, 188, 255]);
    }

    #[test]
    fn composites_transparency_over_white_in_linear_light() {
        let transparent = bead_pattern_pixels(&[0, 0, 0, 0], 1, 1, 1, 1, &[255, 255, 255]).unwrap();
        let translucent =
            bead_pattern_pixels(&[0, 0, 0, 128], 1, 1, 1, 1, &[188, 188, 188]).unwrap();
        assert_eq!(transparent, [255, 255, 255, 255]);
        assert_eq!(translucent, [188, 188, 188, 255]);
    }

    #[test]
    fn selects_colors_by_oklab_distance() {
        let result = bead_pattern_pixels(
            &[72, 237, 234, 255],
            1,
            1,
            1,
            1,
            &[40, 180, 190, 190, 190, 190],
        )
        .unwrap();
        assert_eq!(result, [190, 190, 190, 255]);
    }

    #[test]
    fn limits_bead_colors_to_the_selected_palette() {
        let result = bead_pattern_pixels(&[255, 255, 255, 255], 1, 1, 1, 1, &[25, 25, 25]).unwrap();
        assert_eq!(result, [25, 25, 25, 255]);
        assert!(bead_pattern_pixels(&[0, 0, 0, 255], 1, 1, 1, 1, &[]).is_err());
        assert!(bead_pattern_pixels(&[0, 0, 0, 255], 1, 1, 1, 1, &[1, 2]).is_err());
    }

    #[test]
    fn includes_the_hama_chart_colors_and_codes() {
        assert_eq!(PALETTE.len(), 85);
        assert_eq!(PALETTE[0], (1, [229, 236, 241]));
        assert_eq!(PALETTE[14], (15, [72, 126, 213]));
        assert_eq!(PALETTE[75], (119, [65, 103, 180]));
        assert_eq!(PALETTE[84], (56, [237, 191, 159]));
    }
}
