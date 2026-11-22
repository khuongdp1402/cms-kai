# frozen_string_literal: true

require 'csv'

# Imports or updates catalog items from CSV/TSV text, uploaded CSV file, or JSON array.
class Kchat::ProductImportService
  MAX_ROWS = 500
  AVAILABILITY_ALIASES = {
    'in_stock' => 'in_stock',
    'co_san' => 'in_stock',
    'san_hang' => 'in_stock',
    'stock' => 'in_stock',
    'preorder' => 'preorder',
    'pre_order' => 'preorder',
    'order' => 'preorder',
    'booking' => 'preorder',
    'dat_truoc' => 'preorder',
    'custom' => 'custom',
    'theo_yeu_cau' => 'custom',
    'tu_van' => 'custom',
    'service' => 'custom'
  }.freeze

  COLUMN_ALIASES = {
    'name' => 'name',
    'ten' => 'name',
    'ten_san_pham' => 'name',
    'product_name' => 'name',
    'sku' => 'sku',
    'ma' => 'sku',
    'ma_san_pham' => 'sku',
    'price' => 'price',
    'gia' => 'price',
    'gia_ban' => 'price',
    'availability_mode' => 'availability_mode',
    'loai' => 'availability_mode',
    'hinh_thuc' => 'availability_mode',
    'stock' => 'stock',
    'ton_kho' => 'stock',
    'so_luong' => 'stock',
    'category' => 'category',
    'nhom' => 'category',
    'tag' => 'category',
    'danh_muc' => 'category',
    'description' => 'description',
    'mo_ta' => 'description',
    'thong_tin' => 'description',
    'pitch_template' => 'pitch_template',
    'tin_nhan_mau' => 'pitch_template',
    'mau_tu_van' => 'pitch_template',
    'image_remote_url' => 'image_remote_url',
    'image_url' => 'image_remote_url',
    'anh' => 'image_remote_url',
    'external_id' => 'external_id',
    'ma_pos' => 'external_id',
    'pos_id' => 'external_id'
  }.freeze

  def initialize(account)
    @account = account
  end

  def call(csv_text: nil, products: nil)
    rows = extract_rows(csv_text, products)
    raise ArgumentError, 'limit_exceeded' if rows.size > MAX_ROWS

    process_rows(rows)
  end

  private

  def extract_rows(csv_text, products)
    return parse_array(products) if products.is_a?(Array)
    return parse_csv(csv_text.to_s) if csv_text.present?

    []
  end

  def parse_array(products)
    products.each_with_index.map do |row, idx|
      normalized = row.to_h.each_with_object({}) do |(k, v), acc|
        canonical = COLUMN_ALIASES[normalize_header(k)]
        acc[canonical] = v if canonical
      end
      { row: idx + 1, attrs: normalized }
    end
  end

  def parse_csv(text)
    cleaned = text.delete_prefix("\xEF\xBB\xBF").strip
    return [] if cleaned.empty?

    col_sep = detect_separator(cleaned)
    parsed = CSV.parse(cleaned, headers: true, col_sep: col_sep, liberal_parsing: true)
    parsed.each_with_index.filter_map do |csv_row, idx|
      attrs = map_csv_row(csv_row)
      next if attrs.values.all?(&:blank?)

      { row: idx + 2, attrs: attrs }
    end
  end

  def detect_separator(text)
    first_line = text.lines.first.to_s
    first_line.count("\t") > first_line.count(',') ? "\t" : ','
  end

  def map_csv_row(csv_row)
    csv_row.to_h.each_with_object({}) do |(header, value), acc|
      canonical = COLUMN_ALIASES[normalize_header(header)]
      acc[canonical] = value.to_s.strip if canonical && !value.nil?
    end
  end

  def normalize_header(raw)
    ascii = I18n.transliterate(raw.to_s, locale: :en)
    ascii.downcase.strip.gsub(/[\s-]+/, '_').gsub(/[^a-z0-9_]/, '')
  rescue StandardError
    raw.to_s.downcase.strip.gsub(/[\s-]+/, '_').gsub(/[^a-z0-9_]/, '')
  end

  def process_rows(rows)
    result = { imported_count: 0, created_count: 0, updated_count: 0, errors: [] }
    rows.each do |entry|
      upsert_row(entry, result)
    end
    result
  end

  def upsert_row(entry, result)
    attrs = build_attributes(entry[:attrs])
    record, is_new = find_or_initialize_product(attrs)
    record.assign_attributes(attrs)
    if record.save
      result[:imported_count] += 1
      result[is_new ? :created_count : :updated_count] += 1
    else
      result[:errors] << { row: entry[:row], message: record.errors.full_messages.join(', ') }
    end
  end

  def find_or_initialize_product(attrs)
    existing = find_existing(attrs)
    return [existing, false] if existing

    [Kchat::Product.new(account_id: @account.id, active: true), true]
  end

  def find_existing(attrs)
    if attrs[:external_id].present?
      match = Kchat::Product.find_by(account_id: @account.id, external_id: attrs[:external_id])
      return match if match
    end
    return Kchat::Product.find_by(account_id: @account.id, sku: attrs[:sku]) if attrs[:sku].present?

    nil
  end

  def build_attributes(raw)
    mode = normalize_availability(raw['availability_mode'])
    attrs = {
      name: raw['name'].to_s.strip,
      price: parse_price(raw['price']),
      availability_mode: mode,
      stock: mode == 'in_stock' ? parse_stock(raw['stock']) : nil
    }
    assign_optional_fields(attrs, raw)
    attrs
  end

  def assign_optional_fields(attrs, raw)
    { sku: 'sku', category: 'category', description: 'description',
      pitch_template: 'pitch_template', external_id: 'external_id',
      image_remote_url: 'image_remote_url' }.each do |attr_key, raw_key|
      next unless raw.key?(raw_key)

      attrs[attr_key] = raw[raw_key].to_s.strip.presence
    end
  end

  def normalize_availability(value)
    return 'in_stock' if value.blank?

    AVAILABILITY_ALIASES.fetch(normalize_header(value), value.to_s.strip)
  end

  def parse_price(value)
    return 0 if value.blank?

    digits = value.to_s.strip.gsub(/[.,\s]/, '')
    digits.match?(/\A\d+\z/) ? digits.to_i : -1
  end

  def parse_stock(value)
    text = value.to_s.strip
    return nil if text.empty?

    text.match?(/\A\d+\z/) ? text.to_i : -1
  end
end
