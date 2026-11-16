class Api::V1::Accounts::Kchat::ReportsController < Api::V1::Accounts::Kchat::BaseController
  def summary
    range = params.fetch(:range, 'today').to_s
    return render_kchat_error('invalid_range', :unprocessable_entity) unless ::Kchat::Reports::RANGES.include?(range)

    render json: ::Kchat::Reports.new(Current.account, range).summary
  end
end
