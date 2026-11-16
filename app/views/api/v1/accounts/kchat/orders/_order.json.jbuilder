json.id order.id
json.number order.number
json.status order.status
json.source order.source
json.payment_method order.payment_method
if order.contact
  json.contact do
    json.id order.contact.id
    json.name order.contact.name
    json.phone order.contact.phone_number
  end
else
  json.contact nil
end
json.conversation_id order.conversation&.display_id
json.items order.items.sort_by(&:id) do |item|
  json.id item.id
  json.product_id item.product_id
  json.name item.name
  json.unit_price item.unit_price
  json.quantity item.quantity
end
json.subtotal order.subtotal
json.shipping_fee order.shipping_fee
json.total order.total
json.shipping_address order.shipping_address
json.shipping_carrier order.shipping_carrier
json.tracking_code order.tracking_code
json.paid_at order.paid_at&.iso8601
json.created_at order.created_at.iso8601
