// ===== 0. Supabase 연결 설정 =====
// Supabase 대시보드 > Project Settings > API 에서 복사해 아래에 직접 넣어주세요.
const SUPABASE_URL = 'https://uwkcagolnwyzlbducuoh.supabase.co';  // 예: 'https://xxxx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3a2NhZ29sbnd5emxiZHVjdW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjE1MDMsImV4cCI6MjEwNjk5NzUwM30.IG4D8va-NySn2dFtsnsAAY1M4KayybFkbZs0JtZ-GYs';  // anon(public) 키

// index.html에서 불러온 supabase-js가 만들어둔 전역 객체 supabase로 클라이언트를 만듭니다.
// 이후 supabaseClient로 DB에 접근합니다.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ===== 1. 화면의 요소들 가져오기 =====
// document.getElementById("id") : HTML에서 id가 일치하는 요소를 찾아 변수에 담습니다.
const form = document.getElementById('order-form');
const nameInput = document.getElementById('name');
const drinkSelect = document.getElementById('drink');
const quantityInput = document.getElementById('quantity');
const totalPriceBox = document.getElementById('total-price');
const orderResult = document.getElementById('order-result');

// querySelectorAll : 조건에 맞는 요소를 전부 찾아 목록으로 돌려줍니다.
// name="option"인 체크박스 4개를 한 번에 가져옵니다.
const optionCheckboxes = document.querySelectorAll('input[name="option"]');


// ===== 2. 금액 계산 함수 =====
// 현재 선택된 값들을 읽어서 "총 금액(숫자)"을 돌려주는 함수입니다.
// 화면 표시와 주문 확인 메시지에서 모두 이 함수를 재사용합니다.
function calculateTotal() {
  // (1) 음료 가격
  // 선택된 <option>의 data-price 값을 읽습니다.
  // dataset.price는 항상 "문자열"이라서 Number()로 숫자로 바꿔줍니다.
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
  const drinkPrice = Number(selectedDrink.dataset.price);

  // 음료를 아직 안 골랐으면(value가 빈 문자열) 0원으로 처리합니다.
  if (drinkSelect.value === '') {
    return 0;
  }

  // (2) 사이즈 가격
  // :checked → 현재 선택된 라디오 버튼 하나를 찾습니다.
  const selectedSize = document.querySelector('input[name="size"]:checked');
  const sizePrice = Number(selectedSize.dataset.price);

  // (3) 추가 옵션 가격
  // 체크된 체크박스의 가격을 모두 더합니다.
  let optionsPrice = 0;
  optionCheckboxes.forEach(function (checkbox) {
    if (checkbox.checked) {
      optionsPrice += Number(checkbox.dataset.price);
    }
  });

  // (4) 수량
  // 입력값이 비었거나 범위를 벗어나도 1~10 안으로 맞춰서 계산합니다.
  let quantity = Number(quantityInput.value);
  if (!quantity || quantity < 1) quantity = 1;
  if (quantity > 10) quantity = 10;

  // (5) 한 잔 가격(음료 + 사이즈 + 옵션)에 수량을 곱합니다.
  return (drinkPrice + sizePrice + optionsPrice) * quantity;
}


// ===== 3. 예상 금액을 화면에 표시하는 함수 =====
function updateTotalDisplay() {
  const total = calculateTotal();
  // toLocaleString() : 숫자에 천 단위 콤마를 붙여줍니다. (5000 → "5,000")
  totalPriceBox.textContent = '예상 금액: ' + total.toLocaleString() + '원';
}


// ===== 4. 값이 바뀔 때마다 실시간으로 금액 갱신 =====
// 'change' : 선택값이 바뀌었을 때, 'input' : 입력하는 도중 매번 발생하는 이벤트입니다.
drinkSelect.addEventListener('change', updateTotalDisplay);
quantityInput.addEventListener('input', updateTotalDisplay);
quantityInput.addEventListener('change', updateTotalDisplay);

// 사이즈 라디오 버튼 3개 모두에 같은 동작을 연결합니다.
document.querySelectorAll('input[name="size"]').forEach(function (radio) {
  radio.addEventListener('change', updateTotalDisplay);
});

// 추가 옵션 체크박스 4개에도 연결합니다.
optionCheckboxes.forEach(function (checkbox) {
  checkbox.addEventListener('change', updateTotalDisplay);
});


// ===== 5. 주문하기 (폼 제출) =====
// async : 안에서 await(저장 완료 기다리기)를 쓰기 위해 붙입니다.
form.addEventListener('submit', async function (event) {
  // 폼의 기본 동작(페이지 새로고침)을 막습니다.
  event.preventDefault();

  // trim() : 앞뒤 공백을 제거합니다. 공백만 입력한 경우도 "빈 이름"으로 처리하기 위해서입니다.
  const customerName = nameInput.value.trim();

  // 이름 검사
  if (customerName === '') {
    alert('이름을 입력해주세요');
    nameInput.focus(); // 이름 칸으로 커서를 옮겨줍니다.
    return; // 여기서 함수를 끝내서 아래 코드가 실행되지 않게 합니다.
  }

  // 음료 선택 검사
  if (drinkSelect.value === '') {
    alert('음료를 선택해주세요');
    drinkSelect.focus();
    return;
  }

  // --- 여기까지 왔다면 정상 입력 ---

  // 음료 이름: 선택지 글자가 "카페라떼 4,000원" 형태라서
  // 정규식으로 뒤쪽의 가격 부분을 지워 "카페라떼"만 남깁니다.
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
  const drinkName = selectedDrink.text.replace(/\s*[\d,]+원$/, '');

  // 선택된 사이즈 (S / M / L)
  const size = document.querySelector('input[name="size"]:checked').value;

  // 체크된 옵션 이름들을 배열에 모읍니다.
  const checkedOptions = [];
  optionCheckboxes.forEach(function (checkbox) {
    if (checkbox.checked) {
      checkedOptions.push(checkbox.value);
    }
  });

  // 옵션이 있을 때만 "(샷 추가, 크림 추가)" 형태로 만들고, 없으면 빈 문자열
  // join(', ') : 배열의 값들을 ", "로 이어붙입니다.
  const optionText =
    checkedOptions.length > 0 ? ' (' + checkedOptions.join(', ') + ')' : '';

  // 수량과 총 금액 (calculateTotal 재사용)
  let quantity = Number(quantityInput.value);
  if (!quantity || quantity < 1) quantity = 1;
  if (quantity > 10) quantity = 10;
  const total = calculateTotal();
  const requestText = document.getElementById('request').value.trim();

  // --- Supabase에 주문 저장 ---
  // 저장하는 동안 버튼을 잠가서 두 번 눌리는 것을 막습니다.
  const orderBtn = document.getElementById('order-btn');
  orderBtn.disabled = true;

  try {
    // insert() : 테이블에 새 행(row)을 추가합니다. 왼쪽이 열 이름, 오른쪽이 저장할 값입니다.
    // await : 저장이 끝날 때까지 기다립니다. (async 함수 안에서만 사용 가능)
    const { error } = await supabaseClient.from('cafe_menu03').insert({
      customer_name: customerName,
      phone: document.getElementById('phone').value.trim(),
      drink: drinkName,
      drink_price: Number(selectedDrink.dataset.price), // 음료 한 잔의 기본 가격
      size: size,
      options: checkedOptions, // 배열 그대로 저장
      quantity: quantity,
      request: requestText,
      total_price: total
    });

    // Supabase는 실패해도 예외를 던지지 않고 error에 담아 돌려줍니다.
    if (error) {
      throw error;
    }
  } catch (error) {
    // 실패: 알림 + 콘솔에 에러 출력. 확인 메시지와 내역은 만들지 않고 끝냅니다.
    console.error('주문 저장 실패:', error);
    alert('주문 저장에 실패했어요');
    return;
  } finally {
    // 성공이든 실패든 버튼을 다시 사용할 수 있게 풀어줍니다.
    orderBtn.disabled = false;
  }

  // --- 저장 성공: 여기부터는 기존 동작 ---

  // 주문 확인 메시지 만들기
  const message =
    customerName + '님, ' + drinkName + ' ' + size + '사이즈' + optionText +
    ' ' + quantity + '잔, 총 ' + total.toLocaleString() + '원 주문이 접수되었습니다!';

  // textContent로 넣으면 이름에 특수문자(<, > 등)가 있어도 안전하게 글자로만 표시됩니다.
  orderResult.textContent = message;
  orderResult.hidden = false; // 숨겨둔 영역을 화면에 보이게 합니다.

  // 주문 내역에 저장합니다. (객체 하나 = 주문 1건)
  orders.push({
    id: nextOrderNumber,
    name: customerName,
    drink: drinkName,
    size: size,
    options: checkedOptions,
    quantity: quantity,
    request: requestText,
    total: total,
    time: new Date().toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  });
  nextOrderNumber += 1; // 다음 주문번호 (취소해도 번호는 재사용하지 않음)
  renderOrders();
});


// ===== 6. 다시 작성 =====
// 다시 작성 버튼(type="reset")은 브라우저가 입력값을 초기화해줍니다.
// (사이즈 M, 수량 1은 HTML에 적어둔 기본값으로 돌아갑니다.)
// 다만 'reset' 이벤트는 초기화 "직전"에 발생하므로,
// setTimeout으로 아주 잠깐 기다린 뒤 금액을 다시 계산합니다.
form.addEventListener('reset', function () {
  orderResult.hidden = true; // 주문 확인 메시지 숨기기
  orderResult.textContent = '';
  setTimeout(updateTotalDisplay, 0); // 초기화가 끝난 뒤 금액을 0원으로 갱신
});


// ===== 7. 주문 내역 데이터 =====
// 접수된 주문들을 담는 배열입니다. (새로고침하면 사라집니다)
// '다시 작성' 버튼은 이 배열을 건드리지 않습니다.
let orders = [];
let nextOrderNumber = 1; // 다음에 붙일 주문번호

const orderList = document.getElementById('order-list');
const orderCount = document.getElementById('order-count');
const emptyMessage = document.getElementById('empty-message');
const historyFooter = document.getElementById('history-footer');
const historyTotal = document.getElementById('history-total');


// ===== 8. 주문 내역 그리기 =====
// orders 배열을 보고 화면의 목록, 배지, 합계를 한 번에 다시 그립니다.
// 주문이 추가/삭제될 때마다 이 함수만 부르면 됩니다.
function renderOrders() {
  orderList.textContent = ''; // 기존 카드를 모두 비웁니다.

  // slice().reverse() : 원본은 두고 복사본을 뒤집어 최신 주문이 맨 위에 오게 합니다.
  orders.slice().reverse().forEach(function (order) {
    const card = document.createElement('div');
    card.className = 'order-card';

    // 1줄: "#1 홍길동님 · 5,000원"
    const line1 = document.createElement('div');
    line1.className = 'order-line1';
    line1.textContent =
      '#' + order.id + ' ' + order.name + '님 · ' + order.total.toLocaleString() + '원';

    // 2줄: "카페라떼 M사이즈 (샷 추가) 1잔"
    const optionText = order.options.length > 0 ? ' (' + order.options.join(', ') + ')' : '';
    const line2 = document.createElement('div');
    line2.className = 'order-line2';
    line2.textContent =
      order.drink + ' ' + order.size + '사이즈' + optionText + ' ' + order.quantity + '잔';

    // 3줄: 요청사항(있을 때만) · 주문 시간
    const line3 = document.createElement('div');
    line3.className = 'order-line3';
    line3.textContent = (order.request ? order.request + ' · ' : '') + order.time;

    // 취소 버튼
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = '취소';
    cancelBtn.addEventListener('click', function () {
      // confirm : 확인/취소를 묻는 창. 확인을 누르면 true
      if (confirm('#' + order.id + ' 주문을 취소할까요?')) {
        // filter : 조건에 맞는 것만 남깁니다. (이 주문만 빼고 남김)
        orders = orders.filter(function (o) {
          return o.id !== order.id;
        });
        renderOrders();
      }
    });

    card.append(line1, line2, line3, cancelBtn);
    orderList.appendChild(card);
  });

  // 탭의 건수 배지
  orderCount.textContent = orders.length;

  // 주문이 없으면 안내 문구, 있으면 합계 영역을 보여줍니다.
  const hasOrders = orders.length > 0;
  emptyMessage.classList.toggle('hidden', hasOrders);
  historyFooter.classList.toggle('hidden', !hasOrders);

  // 총 주문 금액: reduce로 모든 주문의 금액을 더합니다.
  const sum = orders.reduce(function (acc, o) {
    return acc + o.total;
  }, 0);
  historyTotal.textContent =
    '총 주문 금액: ' + sum.toLocaleString() + '원 (' + orders.length + '건)';
}

// 내역 모두 지우기
document.getElementById('clear-btn').addEventListener('click', function () {
  if (confirm('주문 내역을 모두 지울까요?')) {
    orders = [];
    renderOrders();
  }
});


// ===== 9. 탭 전환 =====
const tabButtons = document.querySelectorAll('.tab');
const tabPanels = [document.getElementById('tab-order'), document.getElementById('tab-history')];

tabButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    // 누른 탭만 active, 나머지는 해제
    tabButtons.forEach(function (b) {
      b.classList.toggle('active', b === button);
    });
    // 누른 탭의 내용만 보이고, 나머지는 hidden 클래스로 숨김
    tabPanels.forEach(function (panel) {
      panel.classList.toggle('hidden', panel.id !== button.dataset.tab);
    });
  });
});


// ===== 10. 페이지를 처음 열었을 때 =====
// 새로고침 후 브라우저가 이전 선택값을 기억해둘 수 있으므로 금액을 한 번 맞춰줍니다.
updateTotalDisplay();
renderOrders(); // 빈 상태 안내 문구와 배지(0)를 표시
