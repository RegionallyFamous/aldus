/**
 * @wordpress/block-editor mock — stubs for block-editor APIs used in RTL tests.
 */
const React = require( 'react' );

module.exports = {
	MediaUpload: ( { render } ) =>
		render ? render( { open: jest.fn() } ) : null,
	MediaUploadCheck: ( { children } ) => children,
	InspectorControls: ( { children } ) => React.createElement( 'div', null, children ),
	BlockControls: ( { children } ) => React.createElement( 'div', null, children ),
	RichText: ( { value, onChange, tagName: Tag = 'div', ...rest } ) =>
		React.createElement( Tag, {
			...rest,
			dangerouslySetInnerHTML: { __html: value ?? '' },
		} ),
	useBlockProps: () => ( {} ),
	__experimentalLinkControl: () => null,
	URLInput: ( { value, onChange } ) =>
		React.createElement( 'input', {
			type: 'url',
			value: value ?? '',
			onChange: ( e ) => onChange?.( e.target.value ),
		} ),
};
