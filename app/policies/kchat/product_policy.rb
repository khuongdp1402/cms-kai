# Shop administrators manage the catalog; agents only read it (POS, order form).
class Kchat::ProductPolicy < ApplicationPolicy
  def index?
    true
  end

  def show?
    true
  end

  def create?
    @account_user.administrator?
  end

  def update?
    @account_user.administrator?
  end

  def adjust_stock?
    @account_user.administrator?
  end

  def destroy?
    @account_user.administrator?
  end
end
