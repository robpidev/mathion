<script lang="ts">
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let { text }: { text: string } = $props();

	function render(src: string): string {
		return src
			.split(/(\$[^$]+\$)/g)
			.map((part) => {
				if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
					try {
						return katex.renderToString(part.slice(1, -1), { throwOnError: false });
					} catch {
						return escapeHtml(part);
					}
				}
				return escapeHtml(part);
			})
			.join('');
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
</script>

<span class="tex">{@html render(text)}</span>

<style>
	.tex :global(.katex) {
		color: inherit;
		font-size: 1.05em;
	}
</style>
