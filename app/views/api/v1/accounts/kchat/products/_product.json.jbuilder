json.id product.id
json.name product.name
json.sku product.sku
json.price product.price
json.stock product.stock
json.active product.active
json.availability_mode product.availability_mode
json.category product.category
json.description product.description
json.pitch_template product.pitch_template
json.external_id product.external_id
json.image_remote_url product.image_remote_url
json.formatted_pitch product.formatted_pitch
json.image_url product.image.attached? ? url_for(product.image) : product.image_remote_url.presence
