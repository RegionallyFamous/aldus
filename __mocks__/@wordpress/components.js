/**
 * @wordpress/components mock — provides minimal React-based stubs for
 * components used in RTL tests. Each stub renders its children (or a div
 * when no children exist) so assertions can target content.
 */
const React = require( 'react' );

const passthrough = ( { children, ...rest } ) =>
	React.createElement( 'div', rest, children );

const withLabel = ( tag ) =>
	( { children, label, ...rest } ) =>
		React.createElement(
			tag,
			rest,
			label ? React.createElement( 'label', null, label ) : null,
			children
		);

// Props that are valid for WP Button but not for a native DOM <button>.
const WP_BUTTON_NON_DOM_PROPS = new Set( [
	'icon', 'iconSize', 'iconPosition', 'isDestructive', 'isPressed',
	'isBusy', 'isSmall', 'variant', 'size', 'tooltipPosition', 'shortcut',
	'showTooltip', 'label', 'describedBy', 'text', 'href', 'target',
	'__next40pxDefaultSize', '__nextHasNoMarginBottom',
] );

module.exports = {
	Button: ( { children, onClick, label, className, disabled, tabIndex, 'aria-label': ariaLabel, ...rest } ) => {
		// Remaining `rest` keys may contain WP-only props — drop them.
		const domProps = {
			onClick,
			className,
			disabled,
			tabIndex,
			'aria-label': ariaLabel ?? label,
		};
		// Remove undefined entries to keep renders clean.
		Object.keys( domProps ).forEach( ( k ) => {
			if ( domProps[ k ] === undefined ) delete domProps[ k ];
		} );
		return React.createElement( 'button', domProps, children );
	},
	TextControl: React.forwardRef( ( { label, value, onChange }, ref ) =>
		React.createElement(
			'div',
			null,
			label ? React.createElement( 'label', null, label ) : null,
			React.createElement( 'input', {
				ref,
				type: 'text',
				value: value ?? '',
				onChange: ( e ) => onChange?.( e.target.value ),
			} )
		)
	),
	TextareaControl: React.forwardRef( ( { label, value, onChange }, ref ) =>
		React.createElement(
			'div',
			null,
			label ? React.createElement( 'label', null, label ) : null,
			React.createElement( 'textarea', {
				ref,
				value: value ?? '',
				onChange: ( e ) => onChange?.( e.target.value ),
			} )
		)
	),
	SelectControl: ( { label, value, options, onChange } ) =>
		React.createElement(
			'div',
			null,
			label ? React.createElement( 'label', null, label ) : null,
			React.createElement(
				'select',
				{ value: value ?? '', onChange: ( e ) => onChange?.( e.target.value ) },
				( options ?? [] ).map( ( opt ) =>
					React.createElement(
						'option',
						{ key: opt.value, value: opt.value },
						opt.label
					)
				)
			)
		),
	Flex: passthrough,
	FlexItem: passthrough,
	FlexBlock: passthrough,
	Panel: passthrough,
	PanelBody: withLabel( 'div' ),
	PanelRow: passthrough,
	Card: passthrough,
	CardBody: passthrough,
	CardHeader: passthrough,
	Spinner: () => React.createElement( 'span', { className: 'spinner' } ),
	Icon: ( { icon } ) => React.createElement( 'span', { 'data-icon': typeof icon === 'string' ? icon : 'icon' } ),
	Notice: ( { children, status } ) =>
		React.createElement( 'div', { role: 'alert', 'data-status': status }, children ),
	Modal: ( { children, title, onRequestClose } ) =>
		React.createElement(
			'div',
			{ role: 'dialog', 'aria-label': title },
			React.createElement( 'button', { onClick: onRequestClose }, 'Close' ),
			children
		),
	Tooltip: passthrough,
	Popover: passthrough,
	DropZone: passthrough,
	withFocusReturn: ( WrappedComponent ) => WrappedComponent,
	withFilters: () => ( WrappedComponent ) => WrappedComponent,
	createSlotFill: () => ( {
		Slot: passthrough,
		Fill: passthrough,
	} ),
	SlotFillProvider: passthrough,
	ToggleControl: ( { label, checked, onChange } ) =>
		React.createElement(
			'div',
			null,
			React.createElement( 'input', {
				type: 'checkbox',
				checked: checked ?? false,
				onChange: ( e ) => onChange?.( e.target.checked ),
				'aria-label': label,
			} )
		),
	RangeControl: ( { label, value, onChange } ) =>
		React.createElement(
			'div',
			null,
			label ? React.createElement( 'label', null, label ) : null,
			React.createElement( 'input', {
				type: 'range',
				value: value ?? 0,
				onChange: ( e ) => onChange?.( Number( e.target.value ) ),
			} )
		),
	__experimentalSpacer: passthrough,
	__experimentalGrid: passthrough,
	__experimentalHStack: passthrough,
	__experimentalVStack: passthrough,
	__experimentalTruncate: passthrough,
};
