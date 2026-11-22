# Agents draft posts and send them for review; only shop administrators approve what gets published (ADR-031).
class Kchat::PostPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    true
  end

  def update?
    true
  end

  def destroy?
    true
  end

  def submit?
    true
  end

  def approve?
    @account_user.administrator?
  end

  def reject?
    @account_user.administrator?
  end

  def unapprove?
    @account_user.administrator?
  end

  def retry_publish?
    @account_user.administrator?
  end
end
