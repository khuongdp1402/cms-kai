class Api::V1::Accounts::Kchat::ProductsController < Api::V1::Accounts::Kchat::BaseController
  before_action :fetch_product, only: [:update, :destroy]

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

  def destroy
    authorize @product
    @product.destroy!
    head :no_content
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
