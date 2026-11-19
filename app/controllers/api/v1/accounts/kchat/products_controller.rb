class Api::V1::Accounts::Kchat::ProductsController < Api::V1::Accounts::Kchat::BaseController
  before_action :require_active_subscription!, only: [:create, :update, :adjust_stock]
  before_action :fetch_product, only: [:update, :destroy, :adjust_stock]

  def index
    authorize ::Kchat::Product
    @products = filtered_products
  end

  def create
    authorize ::Kchat::Product
    @product = ::Kchat::Product.new(product_params.merge(account_id: Current.account.id))
    return render_invalid(@product) unless @product.save

    render :show, status: :created
  end

  def update
    authorize @product
    return render_invalid(@product) unless @product.update(product_params)

    render :show
  end

  # Relative change (stock count, restock), locked so it cannot race an order reserving stock.
  def adjust_stock
    authorize @product
    delta = Integer(params[:delta].to_s, 10, exception: false)
    return render_kchat_error('validation_failed', :unprocessable_entity) if delta.nil?

    @product.with_lock do
      stock = @product.stock.to_i + delta
      raise ::Kchat::Order::InsufficientStock, @product.id if stock.negative?

      @product.update!(stock: stock)
    end
    render :show
  end

  # A product that orders reference is archived (hidden from POS and the order form) so order history stays linked.
  def destroy
    authorize @product
    if @product.order_items.exists?
      @product.update!(active: false)
      render :show
    else
      @product.destroy!
      head :no_content
    end
  end

  private

  def fetch_product
    @product = ::Kchat::Product.find_by(account_id: Current.account.id, id: params[:id])
    render_not_found unless @product
  end

  def filtered_products
    scope = ::Kchat::Product.where(account_id: Current.account.id).with_attached_image.order(:name, :id)
    scope = scope.where(active: ActiveModel::Type::Boolean.new.cast(params[:active])) if params[:active].present?
    return scope if params[:query].blank?

    pattern = "%#{::Kchat::Product.sanitize_sql_like(params[:query])}%"
    scope.where('name ILIKE :q OR sku ILIKE :q', q: pattern)
  end

  def product_params
    params.permit(:name, :price, :sku, :stock, :active, :image)
  end
end
