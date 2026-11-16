class AddReceivedAtIndexToKchatPaymentEvents < ActiveRecord::Migration[7.1]
  def change
    add_index :kchat_payment_events, :received_at
  end
end
