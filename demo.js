// Fictional records with the same DOM structure as MyKU's current course cards.
const demoCourses = [
  ['mon', '09:00 - 12:00', '01204597-66', 'สัมมนา', 'Seminar', '1', 'E11-S603', 'บรรยาย'],
  ['mon', '13:00 - 16:00', '01204512-66', 'การออกแบบและวิเคราะห์อัลกอริทึมคอมพิวเตอร์', 'Design & Analysis of Computer Algorithms', '1', 'E11-S604', 'บรรยาย'],
  ['tue', '10:00 - 11:00', '01204572-66', 'การประมวลผลสัญญาณหลายมิติ', 'Multidimensional Signal Processing', '1', 'E15-607', 'บรรยาย'],
  ['wed', '13:30 - 16:30', '01204521-66', 'สถาปัตยกรรมระบบดิจิทัล', 'Digital System Architecture', '1', 'E15-603', 'บรรยาย'],
  ['thu', '09:00 - 12:00', '01204519-66', 'วิทยาศาสตร์ข้อมูลขั้นสูง', 'Advanced Data Sciences', '1', 'E15-607', 'บรรยาย'],
  ['thu', '10:00 - 12:00', '01204518-66', 'ความปลอดภัยในโลกออนไลน์', 'Cyber Security', '1', 'E15-608', 'บรรยาย'],
  ['thu', '09:00 - 12:00', '01204527-66', 'ระบบการคำนวณทุกหนแห่ง', 'Ubiquitous Computing Systems', '1', 'E15-609', 'บรรยาย'],
  ['fri', '13:00 - 16:00', '01204591-66', 'ระเบียบวิธีวิจัย', 'Research Methods', '11', 'E11-S601', 'ปฏิบัติ']
];
const container = document.getElementById('demo-courses');
for (const [day, time, code, thai, english, section, room, type] of demoCourses) {
  const wrapper = document.createElement('div');
  // Values here are fixed fixture strings, never remote or user-provided HTML.
  wrapper.innerHTML = `<div class="card"><div class="row"><div class="${day}"><div>${day.toUpperCase()}</div><div>${time}</div></div><div><div>${code}</div><div><span>หมู่</span> <span>${section}</span></div><span class="badge">${type}</span><div class="cut-word">${thai}</div><div class="cut-word">${english}</div><div><span>อ.ผู้สอน </span>อาจารย์ตัวอย่าง</div><div><span>ห้อง </span>${room}</div></div></div></div>`;
  container.append(wrapper);
}
