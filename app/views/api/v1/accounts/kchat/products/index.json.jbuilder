json.payload do
  json.array! @products, partial: 'api/v1/accounts/kchat/products/product', as: :product
end
json.meta do
  json.count @products.size
end
