document.querySelectorAll('[data-copy]').forEach(button => {
  button.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      status.textContent = 'คัดลอกแล้ว';
    } catch {
      status.textContent = 'คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกข้อความและคัดลอกเอง';
    }
  });
});
