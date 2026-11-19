class Api::V1::Accounts::Kchat::ReportsController < Api::V1::Accounts::Kchat::BaseController
  def summary
    range = params.fetch(:range, 'today').to_s
    return render_kchat_error('invalid_range', :unprocessable_entity) unless ::Kchat::Reports::RANGES.include?(range)

    render json: ::Kchat::Reports.new(Current.account, range).summary
  end

  def funnel
    range = params.fetch(:range, 'today').to_s
    return render_kchat_error('invalid_range', :unprocessable_entity) unless ::Kchat::MarketingReports::RANGES.include?(range)

    render json: ::Kchat::MarketingReports.new(Current.account, range).funnel
  end

  def brands_overview
    range = params.fetch(:range, 'today').to_s
    return render_kchat_error('invalid_range', :unprocessable_entity) unless ::Kchat::MarketingReports::RANGES.include?(range)

    render json: ::Kchat::MarketingReports.brands_overview(user: Current.user, range: range)
  end

  def quality_overview
    range = params.fetch(:range, 'today').to_s
    return render_kchat_error('invalid_range', :unprocessable_entity) unless ::Kchat::QualityOverviewReport::RANGES.include?(range)

    render json: ::Kchat::QualityOverviewReport.new(Current.account, range).summary
  end
end
