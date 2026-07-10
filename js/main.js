/**
 * 江西高校信息查询 - 主逻辑
 * 功能：弹窗管理、搜索过滤、卡片渲染、交互效果
 * 安全：使用 textContent 避免 XSS，输入过滤
 */

(function () {
  'use strict';

  // ============ DOM 引用 ============
  const welcomeModal = document.getElementById('welcomeModal');
  const modalCloseBtn = welcomeModal.querySelector('.modal-close-btn');
  const btnCopyQQ = document.getElementById('btnCopyQQ');
  const qqNumber = document.getElementById('qqNumber');
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  const universityGrid = document.getElementById('universityGrid');
  const noResults = document.getElementById('noResults');
  const resultCount = document.getElementById('resultCount');
  const searchQueryDisplay = document.getElementById('searchQuery');
  const backToTop = document.getElementById('backToTop');
  const cityFilters = document.getElementById('cityFilters');
  const levelFilters = document.getElementById('levelFilters');

  // ============ 状态 ============
  let activeCityFilter = 'all';
  let activeLevelFilter = 'all';
  let searchTerm = '';

  // ============ 弹窗管理 ============
  // 每次页面加载都显示弹窗（使用 sessionStorage 确保每次浏览器会话都弹出）
  function showWelcomeModal() {
    // 不检查任何存储，每次打开页面都弹出
    // 用户明确要求：每次打开都会有这么一个小弹窗
    welcomeModal.showModal();
  }

  function closeModal() {
    welcomeModal.close();
  }

  // 关闭按钮
  modalCloseBtn.addEventListener('click', closeModal);

  // 点击遮罩关闭
  welcomeModal.addEventListener('click', function (e) {
    if (e.target === welcomeModal) {
      closeModal();
    }
  });

  // Escape 键关闭（原生 dialog 已支持，无需额外处理）

  // ============ QQ群号复制 ============
  btnCopyQQ.addEventListener('click', function () {
    const qqText = qqNumber.textContent;
    copyToClipboard(qqText);
  });

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopySuccess();
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      showCopySuccess();
    } catch (e) {
      showToast('复制失败，请手动复制群号', false);
    }
    document.body.removeChild(textarea);
  }

  function showCopySuccess() {
    var originalText = btnCopyQQ.textContent;
    btnCopyQQ.textContent = '✅ 已复制！打开QQ加群吧';
    btnCopyQQ.classList.add('copied');
    showToast('QQ群号已复制：' + qqNumber.textContent, true);
    setTimeout(function () {
      btnCopyQQ.textContent = originalText;
      btnCopyQQ.classList.remove('copied');
    }, 2000);
  }

  // ============ Toast 提示 ============
  function showToast(message, isSuccess) {
    // 移除旧 toast
    var oldToast = document.querySelector('.toast');
    if (oldToast) {
      oldToast.remove();
    }

    var toast = document.createElement('div');
    toast.className = 'toast' + (isSuccess ? ' success' : '');
    toast.textContent = message;
    document.body.appendChild(toast);

    // 触发动画
    requestAnimationFrame(function () {
      toast.classList.add('show');
    });

    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 2000);
  }

  // ============ 搜索功能 ============
  var debounceTimer = null;

  searchInput.addEventListener('input', function () {
    // 显示/隐藏清除按钮
    clearSearch.style.display = searchInput.value ? 'block' : 'none';

    // 防抖搜索
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      searchTerm = sanitizeInput(searchInput.value.trim());
      renderUniversities();
    }, 250);
  });

  clearSearch.addEventListener('click', function () {
    searchInput.value = '';
    searchTerm = '';
    clearSearch.style.display = 'none';
    searchInput.focus();
    renderUniversities();
  });

  /**
   * 输入清理：去除 HTML 标签和危险字符
   * @param {string} input - 用户输入
   * @returns {string} 清理后的安全字符串
   */
  function sanitizeInput(input) {
    if (!input) return '';
    // 移除 HTML 标签
    return input.replace(/<[^>]*>/g, '')
                .replace(/[&<>"']/g, '')
                .substring(0, 100);
  }

  // ============ 筛选功能 ============
  cityFilters.addEventListener('click', function (e) {
    var tag = e.target.closest('.filter-tag');
    if (!tag) return;

    // 更新激活状态
    cityFilters.querySelectorAll('.filter-tag').forEach(function (t) {
      t.classList.remove('active');
    });
    tag.classList.add('active');

    activeCityFilter = tag.getAttribute('data-filter');
    renderUniversities();
  });

  levelFilters.addEventListener('click', function (e) {
    var tag = e.target.closest('.filter-tag');
    if (!tag) return;

    // 更新激活状态
    levelFilters.querySelectorAll('.filter-tag').forEach(function (t) {
      t.classList.remove('active');
    });
    tag.classList.add('active');

    activeLevelFilter = tag.getAttribute('data-filter');
    renderUniversities();
  });

  // ============ 数据过滤 ============
  function filterUniversities() {
    return universities.filter(function (uni) {
      // 城市筛选
      if (activeCityFilter !== 'all' && uni.city !== activeCityFilter) {
        return false;
      }

      // 层次筛选
      if (activeLevelFilter !== 'all') {
        if (activeLevelFilter === '211' && uni.level.indexOf('211') === -1 && uni.level.indexOf('双一流') === -1) {
          return false;
        }
        if (activeLevelFilter === '省重点' && uni.level.indexOf('省重点') === -1) {
          return false;
        }
        if (activeLevelFilter === '省属' && (uni.level.indexOf('省属') === -1 || uni.level.indexOf('省重点') !== -1)) {
          return false;
        }
        if (activeLevelFilter === '独立学院' && uni.level.indexOf('独立学院') === -1) {
          return false;
        }
        if (activeLevelFilter === '民办' && (uni.level.indexOf('民办本科') === -1 || uni.level.indexOf('职业') !== -1)) {
          return false;
        }
        if (activeLevelFilter === '职业本科' && uni.level.indexOf('职业本科') === -1) {
          return false;
        }
        if (activeLevelFilter === '公办高职' && uni.level.indexOf('高职') === -1) {
          return false;
        }
      }

      // 搜索过滤
      if (searchTerm) {
        var searchLower = searchTerm.toLowerCase();
        var matchFields = [
          uni.name,
          uni.city,
          uni.level,
          uni.majors,
          uni.description
        ].join(' ').toLowerCase();

        if (matchFields.indexOf(searchLower) === -1) {
          return false;
        }
      }

      return true;
    });
  }

  // ============ 卡片渲染 ============
  function renderUniversities() {
    var filtered = filterUniversities();

    // 更新结果计数
    resultCount.textContent = '共 ' + filtered.length + ' 所高校';
    if (searchTerm) {
      searchQueryDisplay.style.display = 'inline';
      searchQueryDisplay.textContent = '搜索：' + searchTerm;
    } else {
      searchQueryDisplay.style.display = 'none';
    }

    // 无结果
    if (filtered.length === 0) {
      universityGrid.innerHTML = '';
      noResults.style.display = 'block';
      return;
    }

    noResults.style.display = 'none';

    // 渲染卡片
    var fragment = document.createDocumentFragment();
    filtered.forEach(function (uni) {
      var card = createUniversityCard(uni);
      fragment.appendChild(card);
    });

    universityGrid.innerHTML = '';
    universityGrid.appendChild(fragment);
  }

  /**
   * 创建高校卡片 - 使用 textContent 避免 XSS
   */
  function createUniversityCard(uni) {
    var card = document.createElement('div');
    card.className = 'university-card';
    card.setAttribute('data-id', uni.id);

    // 卡片头部
    var cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    var title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = uni.name;

    var badges = document.createElement('div');
    badges.className = 'card-badges';

    var levelBadge = document.createElement('span');
    levelBadge.className = 'badge badge-level';
    levelBadge.textContent = uni.level;

    var cityBadge = document.createElement('span');
    cityBadge.className = 'badge badge-city';
    cityBadge.textContent = uni.city;

    badges.appendChild(levelBadge);
    badges.appendChild(cityBadge);
    cardHeader.appendChild(title);
    cardHeader.appendChild(badges);

    // 描述
    var description = document.createElement('p');
    description.className = 'card-description';
    description.textContent = uni.description;

    // 详情网格
    var details = document.createElement('div');
    details.className = 'card-details';

    var detailItems = [
      { icon: '🪖', label: '军训', value: uni.militaryTraining },
      { icon: '🏠', label: '宿舍', value: uni.dormitory },
      { icon: '🍽️', label: '食堂', value: uni.cafeteria },
      { icon: '📐', label: '面积', value: uni.campusArea },
      { icon: '⭐', label: '特色专业', value: uni.majors },
      { icon: '💰', label: '学费', value: uni.tuition },
      { icon: '🚇', label: '交通', value: uni.transportation },
      { icon: '👥', label: '男女比例', value: uni.genderRatio }
    ];

    detailItems.forEach(function (item) {
      var detailItem = document.createElement('div');
      detailItem.className = 'detail-item';

      var icon = document.createElement('span');
      icon.className = 'detail-icon';
      icon.textContent = item.icon;
      icon.setAttribute('aria-hidden', 'true');

      var textWrap = document.createElement('div');

      var label = document.createElement('span');
      label.className = 'detail-label';
      label.textContent = item.label + '：';

      var value = document.createElement('span');
      value.className = 'detail-value';
      value.textContent = item.value;

      textWrap.appendChild(label);
      textWrap.appendChild(value);
      detailItem.appendChild(icon);
      detailItem.appendChild(textWrap);
      details.appendChild(detailItem);
    });

    // 卡片底部链接
    var footer = document.createElement('div');
    footer.className = 'card-footer';

    // 官网链接 - 验证URL安全
    if (isSafeUrl(uni.website)) {
      var websiteLink = document.createElement('a');
      websiteLink.href = uni.website;
      websiteLink.className = 'card-link external';
      websiteLink.target = '_blank';
      websiteLink.rel = 'noopener noreferrer';
      websiteLink.textContent = '🌐 访问官网';
      footer.appendChild(websiteLink);
    }

    // 详情按钮（展开查看更多）
    var detailBtn = document.createElement('button');
    detailBtn.className = 'card-link';
    detailBtn.textContent = '📋 查看详情';
    detailBtn.addEventListener('click', function () {
      showUniversityDetail(uni);
    });
    footer.appendChild(detailBtn);

    // 组装卡片
    card.appendChild(cardHeader);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);

    return card;
  }

  /**
   * URL 安全验证
   */
  function isSafeUrl(url) {
    if (!url) return false;
    try {
      var parsed = new URL(url);
      return ['https:', 'http:'].indexOf(parsed.protocol) !== -1;
    } catch (e) {
      return false;
    }
  }

  /**
   * 显示高校详情弹窗
   */
  function showUniversityDetail(uni) {
    var detailDialog = document.createElement('dialog');
    detailDialog.setAttribute('aria-labelledby', 'detail-title');
    detailDialog.style.cssText = [
      'border: none;',
      'border-radius: 16px;',
      'padding: 0;',
      'max-width: 560px;',
      'width: 90%;',
      'box-shadow: 0 8px 30px rgba(0,0,0,0.12);',
      'max-height: 85vh;',
      'overflow-y: auto;'
    ].join('');

    var content = document.createElement('div');
    content.style.cssText = 'padding: 30px 24px 24px; position: relative;';

    // 关闭按钮
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.style.cssText = [
      'position: absolute; top: 10px; right: 14px;',
      'background: none; border: none; font-size: 1.5rem;',
      'color: #9aa0a6; cursor: pointer;',
      'width: 32px; height: 32px; border-radius: 50%;',
      'display: flex; align-items: center; justify-content: center;'
    ].join('');
    closeBtn.addEventListener('click', function () { detailDialog.close(); detailDialog.remove(); });
    detailDialog.addEventListener('click', function (e) {
      if (e.target === detailDialog) { detailDialog.close(); detailDialog.remove(); }
    });

    // 标题
    var title = document.createElement('h2');
    title.id = 'detail-title';
    title.textContent = uni.name;
    title.style.cssText = 'font-size: 1.3rem; font-weight: 700; margin-bottom: 4px; color: #2c3e50;';

    // 标签
    var meta = document.createElement('p');
    meta.style.cssText = 'font-size: 0.85rem; color: #5f6368; margin-bottom: 16px;';
    meta.textContent = uni.level + ' | ' + uni.city;

    // 描述
    var desc = document.createElement('p');
    desc.textContent = uni.description;
    desc.style.cssText = 'font-size: 0.9rem; color: #5f6368; margin-bottom: 18px; line-height: 1.6; padding: 12px; background: #f5f7fa; border-radius: 8px;';

    // 详细信息列表
    var infoList = document.createElement('div');
    var fullDetails = [
      { icon: '🪖', label: '军训时间', value: uni.militaryTraining },
      { icon: '🏠', label: '宿舍条件', value: uni.dormitory },
      { icon: '🍽️', label: '食堂情况', value: uni.cafeteria },
      { icon: '📐', label: '校园面积', value: uni.campusArea },
      { icon: '⭐', label: '特色专业', value: uni.majors },
      { icon: '💰', label: '学费范围', value: uni.tuition },
      { icon: '🚇', label: '交通便利度', value: uni.transportation },
      { icon: '👥', label: '男女比例', value: uni.genderRatio },
      { icon: '🎯', label: '社团数量', value: uni.clubs }
    ];

    fullDetails.forEach(function (item) {
      var row = document.createElement('div');
      row.style.cssText = 'display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 0.88rem;';

      var icon = document.createElement('span');
      icon.textContent = item.icon;
      icon.style.cssText = 'flex-shrink: 0; font-size: 1rem;';

      var label = document.createElement('span');
      label.textContent = item.label;
      label.style.cssText = 'flex-shrink: 0; color: #9aa0a6; font-weight: 500; min-width: 70px;';

      var value = document.createElement('span');
      value.textContent = item.value;
      value.style.cssText = 'color: #2c3e50;';

      row.appendChild(icon);
      row.appendChild(label);
      row.appendChild(value);
      infoList.appendChild(row);
    });

    // 官网链接
    var linkWrap = document.createElement('div');
    linkWrap.style.cssText = 'margin-top: 16px; text-align: center;';

    if (isSafeUrl(uni.website)) {
      var link = document.createElement('a');
      link.href = uni.website;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '🌐 访问 ' + uni.name + ' 官网';
      link.style.cssText = [
        'display: inline-block; padding: 10px 24px;',
        'background: #1a73e8; color: #fff; text-decoration: none;',
        'border-radius: 25px; font-weight: 600; font-size: 0.9rem;',
        'transition: background 0.2s;'
      ].join('');
      linkWrap.appendChild(link);
    }

    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(meta);
    content.appendChild(desc);
    content.appendChild(infoList);
    content.appendChild(linkWrap);
    detailDialog.appendChild(content);
    document.body.appendChild(detailDialog);
    detailDialog.showModal();
  }

  // ============ 回到顶部 ============
  function handleScroll() {
    if (window.scrollY > 400) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ============ 键盘快捷键 ============
  document.addEventListener('keydown', function (e) {
    // Ctrl+K 或 / 聚焦搜索框
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement === document.body)) {
      e.preventDefault();
      searchInput.focus();
    }
    // Escape 关闭弹窗（如果打开着）
    if (e.key === 'Escape' && welcomeModal.open) {
      closeModal();
    }
  });

  // ============ 初始化 ============
  function init() {
    renderUniversities();
    // 页面加载完成后立即显示弹窗
    showWelcomeModal();
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
