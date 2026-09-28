# frozen_string_literal: true

class ZaloPersonal::ConnectionAttempts::CancelService
  def initialize(attempt:)
    @attempt = attempt
  end

  def perform
    @attempt.cancel!
    { success: true }
  end
end
