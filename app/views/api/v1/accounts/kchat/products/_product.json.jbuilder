json.id product.id
json.name product.name
json.sku product.sku
json.price product.price
json.stock product.stock
json.active product.active
json.image_url product.image.attached? ? url_for(product.image) : nil
