require 'rails_helper'

RSpec.describe Kchat::DemandBotService do
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:contact) { create(:contact, account: account, name: 'Chị Lan') }
  let(:conversation) { create(:conversation, account: account, inbox: inbox, contact: contact) }
  let!(:hotel) do
    Kchat::Product.create!(
      account: account, name: 'Phòng Deluxe Biển', category: 'Khách sạn',
      availability_mode: 'preorder', price: 2_400_000, description: 'Bao gồm ăn sáng'
    )
  end

  def incoming(text)
    create(:message, account: account, inbox: inbox, conversation: conversation,
                     sender: contact, message_type: :incoming, content: text)
  end

  it 'does nothing when bot is disabled' do
    msg = incoming('cho em hỏi khách sạn')
    expect { described_class.new(account).process_message!(msg) }
      .not_to change(Message, :count)
  end

  it 'replies using matching demand rule with attached product pitch and assigns labels' do
    create(:label, account: account, title: 'khach_san')
    account.update!(custom_attributes: {
                      'kchat_bot' => {
                        'enabled' => true,
                        'rules' => [{
                          'id' => 'r1', 'name' => 'Khách sạn', 'active' => true,
                          'keywords' => ['khách sạn', 'phòng'],
                          'reply' => 'Chào {{contact.name}}, em gửi bảng giá phòng:',
                          'product_ids' => [hotel.id],
                          'assign_labels' => ['khach_san']
                        }]
                      }
                    })

    msg = incoming('Mình muốn đặt phòng khách sạn cuối tuần')
    reply = described_class.new(account).process_message!(msg)
    expect(reply).to be_present
    expect(reply.content).to include('Chào Chị Lan', 'Phòng Deluxe Biển', '2.400.000đ')
    expect(reply.content_attributes['automation_rule_id']).to eq('kchat_demand_bot')
    expect(conversation.reload.label_list).to include('khach_san')

    # Cooldown prevents duplicate auto-reply right after
    expect(described_class.new(account).process_message!(incoming('phòng giá sao ạ'))).to be_nil
  end

  it 'auto-suggests matching catalog products or sends welcome message, and pauses when agent replied' do
    account.update!(custom_attributes: {
                      'kchat_bot' => {
                        'enabled' => true, 'auto_suggest_products' => true, 'welcome_enabled' => true,
                        'welcome_message' => 'Xin chào {{contact.name}}!', 'rules' => []
                      }
                    })

    welcome = described_class.new(account).process_message!(incoming('alo shop ơi'))
    expect(welcome.content).to eq('Xin chào Chị Lan!')

    suggest = described_class.new(account).process_message!(incoming('có Phòng Deluxe nào không'))
    expect(suggest.content).to include('Phòng Deluxe Biển', '2.400.000đ')

    agent = create(:user, account: account, role: :agent)
    create(:message, account: account, inbox: inbox, conversation: conversation, sender: agent, message_type: :outgoing, content: 'Em tư vấn ạ')
    expect(described_class.new(account).process_message!(incoming('phòng còn không'))).to be_nil
  end
end
