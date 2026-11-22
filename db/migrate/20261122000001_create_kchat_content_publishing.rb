# Kalo auto posting (ADR-031): content plans and Facebook Page posts that an admin approves and
# Kalo publishes on schedule.
class CreateKchatContentPublishing < ActiveRecord::Migration[7.1]
  def change
    create_table :kchat_content_plans do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.string :title, null: false
      t.string :goal
      t.date :starts_on
      t.date :ends_on
      t.integer :posts_per_week
      t.jsonb :pillars, null: false, default: []
      t.jsonb :brief, null: false, default: {}
      t.string :status, null: false, default: 'draft'
      t.timestamps
    end

    create_table :kchat_posts do |t|
      t.references :account, null: false, foreign_key: { on_delete: :cascade }
      t.references :inbox, foreign_key: { on_delete: :nullify }
      t.references :content_plan, foreign_key: { to_table: :kchat_content_plans, on_delete: :nullify }
      t.references :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.references :approved_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :status, null: false, default: 'draft'
      t.string :post_format, null: false, default: 'text'
      t.text :caption
      t.string :link_url
      t.string :pillar
      t.text :media_brief
      t.text :review_note
      t.datetime :scheduled_at
      t.datetime :approved_at
      t.datetime :publishing_started_at
      t.datetime :published_at
      t.string :external_post_id
      t.string :permalink
      t.string :error_code
      t.text :error_message
      t.integer :attempts, null: false, default: 0
      t.jsonb :metrics, null: false, default: {}
      t.boolean :ai_generated, null: false, default: false
      # Media studio link (ADR-032): `studio` posts come from Omni-Viral Studio, `source_ref` is its video id.
      t.string :source, null: false, default: 'kalo'
      t.string :source_ref
      t.string :media_request_status
      t.text :media_request_note
      t.datetime :media_requested_at
      t.timestamps
    end

    add_index :kchat_posts, [:account_id, :scheduled_at]
    add_index :kchat_posts, [:account_id, :status]
    add_index :kchat_posts, [:status, :scheduled_at]
    add_index :kchat_posts, [:account_id, :media_request_status]
    add_index :kchat_posts, [:account_id, :source, :source_ref], unique: true, where: 'source_ref IS NOT NULL'
  end
end
