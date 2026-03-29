/**
 * github-projects.js
 * Loads member data from data/members.json and fetches each member's
 * public GitHub repositories via the GitHub REST API, then renders
 * them as filterable project cards.
 */

(function () {
	'use strict';

	var GITHUB_API = 'https://api.github.com/users/';
	var REPOS_PER_MEMBER = 6;
	var membersData = [];

	/* ------------------------------------------------------------------ */
	/* Utility helpers                                                       */
	/* ------------------------------------------------------------------ */

	function escapeHtml(str) {
		if (!str) { return ''; }
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function formatDate(isoString) {
		if (!isoString) { return ''; }
		try {
			var d = new Date(isoString);
			return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
		} catch (e) {
			return '';
		}
	}

	/* ------------------------------------------------------------------ */
	/* Rendering                                                             */
	/* ------------------------------------------------------------------ */

	function renderMemberSection(member, repos) {
		var container = document.getElementById('github-projects-container');
		if (!container) { return; }

		var section = document.createElement('div');
		section.className = 'github-member-section';
		section.setAttribute('data-member', escapeHtml(member.name));

		var heading = document.createElement('h3');
		heading.className = 'github-member-heading';
		heading.textContent = member.name;

		var meta = document.createElement('p');
		meta.className = 'github-member-meta';
		var metaParts = [];
		if (member.role) { metaParts.push(escapeHtml(member.role)); }
		if (member.bio) { metaParts.push(escapeHtml(member.bio)); }
		if (member.github) {
			metaParts.push(
				'<a href="https://github.com/' + escapeHtml(member.github) +
				'" target="_blank" rel="noopener noreferrer" class="icon brands fa-github">' +
				' @' + escapeHtml(member.github) + '</a>'
			);
		}
		meta.innerHTML = metaParts.join(' &middot; ');

		section.appendChild(heading);
		section.appendChild(meta);

		if (!repos || repos.length === 0) {
			var empty = document.createElement('p');
			empty.className = 'github-no-repos';
			empty.textContent = member.github
				? 'No public repositories found.'
				: 'GitHub profile not configured for this member.';
			section.appendChild(empty);
		} else {
			var grid = document.createElement('div');
			grid.className = 'posts';

			repos.forEach(function (repo) {
				grid.appendChild(renderRepoCard(repo, member.name));
			});

			section.appendChild(grid);
		}

		container.appendChild(section);
	}

	function renderRepoCard(repo, memberName) {
		var article = document.createElement('article');
		article.className = 'github-repo-card';
		article.setAttribute('data-language', escapeHtml(repo.language || 'unknown'));
		article.setAttribute('data-member', escapeHtml(memberName));

		var nameLink = document.createElement('h4');
		nameLink.innerHTML =
			'<a href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer">' +
			escapeHtml(repo.name) + '</a>';

		var desc = document.createElement('p');
		desc.className = 'github-repo-desc';
		desc.textContent = repo.description || 'No description provided.';

		var stats = document.createElement('ul');
		stats.className = 'github-repo-stats';

		if (repo.language) {
			var langItem = document.createElement('li');
			langItem.className = 'github-repo-lang';
			langItem.innerHTML =
				'<span class="github-lang-dot" aria-hidden="true"></span>' +
				escapeHtml(repo.language);
			langItem.setAttribute('data-lang', escapeHtml(repo.language));
			stats.appendChild(langItem);
		}

		var starsItem = document.createElement('li');
		starsItem.innerHTML =
			'<span class="icon solid fa-star" aria-hidden="true" title="Stars"></span> ' +
			escapeHtml(String(repo.stargazers_count || 0));
		stats.appendChild(starsItem);

		var forksItem = document.createElement('li');
		forksItem.innerHTML =
			'<span class="icon solid fa-code-branch" aria-hidden="true" title="Forks"></span> ' +
			escapeHtml(String(repo.forks_count || 0));
		stats.appendChild(forksItem);

		if (repo.updated_at) {
			var updatedItem = document.createElement('li');
			updatedItem.className = 'github-repo-updated';
			updatedItem.textContent = 'Updated ' + formatDate(repo.updated_at);
			stats.appendChild(updatedItem);
		}

		article.appendChild(nameLink);
		article.appendChild(desc);
		article.appendChild(stats);

		return article;
	}

	function renderError(member, message) {
		var container = document.getElementById('github-projects-container');
		if (!container) { return; }

		var section = document.createElement('div');
		section.className = 'github-member-section';

		var heading = document.createElement('h3');
		heading.className = 'github-member-heading';
		heading.textContent = member.name;

		var err = document.createElement('p');
		err.className = 'github-fetch-error';
		err.textContent = message;

		section.appendChild(heading);
		section.appendChild(err);
		container.appendChild(section);
	}

	/* ------------------------------------------------------------------ */
	/* Filter UI                                                             */
	/* ------------------------------------------------------------------ */

	function collectLanguages() {
		var langs = {};
		var cards = document.querySelectorAll('.github-repo-card');
		for (var i = 0; i < cards.length; i++) {
			var lang = cards[i].getAttribute('data-language');
			if (lang && lang !== 'unknown') { langs[lang] = true; }
		}
		return Object.keys(langs).sort();
	}

	function buildFilterUI() {
		var filterContainer = document.getElementById('github-filter-container');
		if (!filterContainer) { return; }

		var langs = collectLanguages();
		if (langs.length === 0) {
			filterContainer.style.display = 'none';
			return;
		}

		var label = document.createElement('label');
		label.setAttribute('for', 'github-lang-filter');
		label.textContent = 'Filter by language: ';

		var select = document.createElement('select');
		select.id = 'github-lang-filter';
		select.className = 'github-filter-select';

		var allOption = document.createElement('option');
		allOption.value = '';
		allOption.textContent = 'All languages';
		select.appendChild(allOption);

		langs.forEach(function (lang) {
			var opt = document.createElement('option');
			opt.value = lang;
			opt.textContent = lang;
			select.appendChild(opt);
		});

		select.addEventListener('change', function () {
			applyFilters();
		});

		filterContainer.appendChild(label);
		filterContainer.appendChild(select);
		filterContainer.style.display = '';
	}

	function applyFilters() {
		var langFilter = document.getElementById('github-lang-filter');
		var selectedLang = langFilter ? langFilter.value : '';

		var cards = document.querySelectorAll('.github-repo-card');
		for (var i = 0; i < cards.length; i++) {
			var card = cards[i];
			var lang = card.getAttribute('data-language');
			var visible = !selectedLang || lang === selectedLang;
			card.style.display = visible ? '' : 'none';
		}

		/* Hide member sections that have no visible cards */
		var sections = document.querySelectorAll('.github-member-section');
		for (var j = 0; j < sections.length; j++) {
			var sec = sections[j];
			var sectionCards = sec.querySelectorAll('.github-repo-card');
			var hasVisible = false;
			for (var k = 0; k < sectionCards.length; k++) {
				if (sectionCards[k].style.display !== 'none') {
					hasVisible = true;
					break;
				}
			}
			sec.style.display = (sectionCards.length === 0 || hasVisible) ? '' : 'none';
		}
	}

	/* ------------------------------------------------------------------ */
	/* Data fetching                                                         */
	/* ------------------------------------------------------------------ */

	function fetchRepos(github) {
		var url = GITHUB_API + encodeURIComponent(github) +
			'/repos?sort=updated&per_page=' + REPOS_PER_MEMBER + '&type=public';
		return fetch(url).then(function (response) {
			if (response.status === 404) {
				return Promise.reject(new Error('GitHub user "' + github + '" not found.'));
			}
			if (response.status === 403) {
				return Promise.reject(new Error('GitHub API rate limit reached. Please try again later.'));
			}
			if (!response.ok) {
				return Promise.reject(new Error('GitHub API error (HTTP ' + response.status + ').'));
			}
			return response.json();
		});
	}

	/**
	 * Process members sequentially to be gentle on the GitHub API rate limit.
	 */
	function processMembersSequentially(members, index) {
		if (index >= members.length) {
			hideLoader();
			buildFilterUI();
			return;
		}

		var member = members[index];

		if (!member.github) {
			renderMemberSection(member, null);
			processMembersSequentially(members, index + 1);
			return;
		}

		fetchRepos(member.github)
			.then(function (repos) {
				renderMemberSection(member, repos);
			})
			.catch(function (err) {
				renderError(member, err.message || 'Could not load repositories.');
			})
			.then(function () {
				processMembersSequentially(members, index + 1);
			});
	}

	function hideLoader() {
		var loader = document.getElementById('github-projects-loader');
		if (loader) { loader.style.display = 'none'; }
	}

	/* ------------------------------------------------------------------ */
	/* Initialisation                                                        */
	/* ------------------------------------------------------------------ */

	function init() {
		fetch('data/members.json')
			.then(function (response) {
				if (!response.ok) {
					return Promise.reject(new Error('Could not load member data.'));
				}
				return response.json();
			})
			.then(function (data) {
				membersData = data.members || [];
				processMembersSequentially(membersData, 0);
			})
			.catch(function (err) {
				hideLoader();
				var container = document.getElementById('github-projects-container');
				if (container) {
					var errEl = document.createElement('p');
					errEl.className = 'github-fetch-error';
					errEl.textContent = 'Error loading member data: ' + (err.message || 'Unknown error.');
					container.appendChild(errEl);
				}
			});
	}

	/* Run after DOM is ready */
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}

}());
