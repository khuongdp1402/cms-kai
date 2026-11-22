json.payload do
  json.array! @posts, partial: 'api/v1/accounts/kchat/posts/post', as: :post
end
json.meta do
  json.count @posts.size
end
