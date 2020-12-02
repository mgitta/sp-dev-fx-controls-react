import * as React from 'react';
import { IFilePickerProps } from './IFilePickerProps';
import { IFilePickerState } from './IFilePickerState';

import { PrimaryButton, ActionButton } from 'office-ui-fabric-react/lib/components/Button';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/components/Panel';
import { Label } from 'office-ui-fabric-react/lib/components/Label';
import { Nav, INavLink, INavLinkGroup } from 'office-ui-fabric-react/lib/Nav';
import { css } from "office-ui-fabric-react/lib/Utilities";

// Localization
import * as strings from 'ControlStrings';

import LinkFilePickerTab from './LinkFilePickerTab/LinkFilePickerTab';
import UploadFilePickerTab from './UploadFilePickerTab/UploadFilePickerTab';
import SiteFilePickerTab from './SiteFilePickerTab/SiteFilePickerTab';
import WebSearchTab from './WebSearchTab/WebSearchTab';
import RecentFilesTab from './RecentFilesTab/RecentFilesTab';

import styles from './FilePicker.module.scss';
import { FileBrowserService } from '../../services/FileBrowserService';
import { OneDriveFilesTab } from './OneDriveFilesTab/OneDriveFilesTab';
import { OneDriveService } from '../../services/OneDriveService';
import { OrgAssetsService } from '../../services/OrgAssetsService';
import { IFilePickerResult } from './FilePicker.types';
import { FilesSearchService } from '../../services/FilesSearchService';

import * as telemetry from '../../common/telemetry';
import { StockImages } from './StockImagesTab/StockImages';

export class FilePicker extends React.Component<IFilePickerProps, IFilePickerState> {
  private fileBrowserService: FileBrowserService;
  private oneDriveService: OneDriveService;
  private orgAssetsService: OrgAssetsService;
  private fileSearchService: FilesSearchService;

  constructor(props: IFilePickerProps) {
    super(props);

    telemetry.track('ReactFilePicker', {});

    // Initialize file browser services
    this.fileBrowserService = new FileBrowserService(props.context, this.props.itemsCountQueryLimit);
    this.oneDriveService = new OneDriveService(props.context, this.props.itemsCountQueryLimit);
    this.orgAssetsService = new OrgAssetsService(props.context, this.props.itemsCountQueryLimit);
    this.fileSearchService = new FilesSearchService(props.context, this.props.bingAPIKey);

    this.state = {
      panelOpen: this.props.isPanelOpen || false,
      organisationAssetsEnabled: false,
      showFullNav: true
    };
  }

  public async componentDidMount() {
    // Load information about Organisation Assets Library
    let orgAssetsEnabled: boolean = false;
    if (!this.props.hideOrganisationalAssetTab) {
      const orgAssetsLibraries = await this.orgAssetsService.getSiteMediaLibraries();
      orgAssetsEnabled = orgAssetsLibraries ? true : false;
    }

    this.setState({
      organisationAssetsEnabled: orgAssetsEnabled,
      selectedTab: this.getDefaultSelectedTabKey(this.props, orgAssetsEnabled)
    });
  }

  public render(): JSX.Element {
    // If no acceptable file type was passed, and we're expecting images, set the default image filter
    const accepts: string[] = this.props.accepts;
    const buttonClassName: string = this.props.buttonClassName ? this.props.buttonClassName : '';
    const panelClassName: string = this.props.panelClassName ? this.props.panelClassName : '';

    const linkTabProps = {
      accepts: accepts,
      context: this.props.context,
      onClose: () => this._handleClosePanel(),
      onSave: (value: IFilePickerResult) => { this._handleSave(value); }
    };
    const buttonProps = {
      text: this.props.buttonLabel,
      disabled: this.props.disabled,
      onClick: this._handleOpenPanel,
      className: `pnp__file-picker__button ${buttonClassName}`
    };

    return (
      <div className={`pnp__file-picker`}>
        {
          this.props.label && <Label required={this.props.required}>{this.props.label}</Label>
        }
        {
          this.props.buttonIcon ?
            <ActionButton iconProps={{ iconName: this.props.buttonIcon }} {...buttonProps} /> :
            <PrimaryButton {...buttonProps} />
        }

        <Panel isOpen={this.state.panelOpen}
          isBlocking={true}
          hasCloseButton={true}
          className={`pnp__file-picker__panel ${styles.filePicker} ${panelClassName}`}
          onDismiss={this._handleClosePanel}
          type={PanelType.extraLarge}
          isFooterAtBottom={true}
          onRenderNavigation={() => { return undefined; }}
          headerText={strings.FilePickerHeader}
          isLightDismiss={true}
          onRenderHeader={() => this._renderHeader()}
        >

          <div className={styles.nav}>
            <Nav
              groups={this._getNavPanelOptions()}
              selectedKey={this.state.selectedTab}
              onLinkClick={(ev?: React.MouseEvent<HTMLElement>, item?: INavLink) => this._handleLinkClick(ev, item)}
            />
          </div>
          <div className={styles.tabsContainer}>
            {
              this.state.selectedTab === "keyLink" &&
              <LinkFilePickerTab
                fileSearchService={this.fileSearchService}
                renderCustomLinkTabContent={this.props.renderCustomLinkTabContent}
                allowExternalTenantLinks={true}
                {...linkTabProps}
              />
            }
            {
              this.state.selectedTab === "keyUpload" &&
              <UploadFilePickerTab
                renderCustomUploadTabContent={this.props.renderCustomUploadTabContent}
                {...linkTabProps}
                onChange={this._handleOnChange}
              />
            }
            {
              this.state.selectedTab === "keySite" &&
              <SiteFilePickerTab
                fileBrowserService={this.fileBrowserService}
                {...linkTabProps}
              />
            }
            {
              this.state.selectedTab === "keyOrgAssets" &&
              <SiteFilePickerTab
                breadcrumbFirstNode={{
                  isCurrentItem: true,
                  text: strings.OrgAssetsTabLabel,
                  key: "keyOrgAssets"
                }}
                fileBrowserService={this.orgAssetsService}
                {...linkTabProps}
              />
            }
            {
              this.state.selectedTab === "keyWeb" &&
              <WebSearchTab
                bingSearchService={this.fileSearchService}
                {...linkTabProps}
              />
            }
            {
              this.state.selectedTab === "keyOneDrive" &&
              <OneDriveFilesTab
                oneDriveService={this.oneDriveService}
                {...linkTabProps}
              />
            }
            {
              this.state.selectedTab === "keyRecent" &&
              <RecentFilesTab
                fileSearchService={this.fileSearchService}
                {...linkTabProps}
              />
            }
            {
              this.state.selectedTab === "keyStockImages" &&
              <StockImages
                language={this.props.context.pageContext.cultureInfo.currentCultureName}
                fileSearchService={this.fileSearchService}
                {...linkTabProps}
              />
            }
          </div>
        </Panel>
      </div >
    );
  }

  /**
   * Renders the panel header
   */
  private _renderHeader = (): JSX.Element => {
    return <div className={"ms-Panel-header"}><p className={css("ms-Panel-headerText", styles.header)} role="heading">{strings.FilePickerHeader}</p></div>;
  }

  /**
   * Open the panel
   */
  private _handleOpenPanel = () => {
    this.setState({
      panelOpen: true,
      selectedTab: this.getDefaultSelectedTabKey(this.props, this.state.organisationAssetsEnabled)
    });
  }

  /**
   * Closes the panel
   */
  private _handleClosePanel = () => {
    if (this.props.onCancel) {
      this.props.onCancel();
    }
    this.setState({
      panelOpen: false
    });
  }

  /**
   * On save action
   */
  private _handleSave = (filePickerResult: IFilePickerResult) => {
    this.props.onSave(filePickerResult);
    this.setState({
      panelOpen: false
    });
  }

  private _handleOnChange = (filePickerResult: IFilePickerResult) => {
    if (this.props.onChange) {
      this.props.onChange(filePickerResult);
    }
  }

  /**
   * Changes the selected tab when a link is selected
   */
  private _handleLinkClick = (ev?: React.MouseEvent<HTMLElement>, item?: INavLink) => {
    this.setState({ selectedTab: item.key });
  }

  /**
   * Prepares navigation panel options
   */
  private _getNavPanelOptions = () => {
    const addUrl = this.props.storeLastActiveTab !== false;
    let links = [];

    if (!this.props.hideRecentTab) {
      links.push({
        name: strings.RecentLinkLabel,
        url: addUrl ? '#recent' : undefined,
        icon: 'Recent',
        key: 'keyRecent',
      });
    }
    if (!this.props.hideStockImages) {
      links.push({
        name: strings.StockImagesLinkLabel,
        url: addUrl ? '#stockImages' : undefined,
        key: 'keyStockImages',
        icon: 'ImageSearch',
      });
    }
    if (this.props.bingAPIKey && !this.props.hideWebSearchTab) {
      links.push({
        name: strings.WebSearchLinkLabel,
        url: addUrl ? '#search' : undefined,
        key: 'keyWeb',
        icon: 'Search',
      });
    }
    if (!this.props.hideOrganisationalAssetTab && this.state.organisationAssetsEnabled) {
      links.push({
        name: 'Your organisation',
        url: addUrl ? '#orgAssets' : undefined,
        icon: 'FabricFolderConfirm',
        key: 'keyOrgAssets',
      });
    }
    if (!this.props.hideOneDriveTab) {
      links.push({
        name: "OneDrive",
        url: addUrl ? '#onedrive' : undefined,
        key: 'keyOneDrive',
        icon: 'OneDrive',
      });
    }
    if (!this.props.hideSiteFilesTab) {
      links.push({
        name: strings.SiteLinkLabel,
        url: addUrl ? '#globe' : undefined,
        key: 'keySite',
        icon: 'Globe',
      });
    }
    if (!this.props.hideLocalUploadTab) {
      links.push({
        name: strings.UploadLinkLabel,
        url: addUrl ? '#upload' : undefined,
        key: 'keyUpload',
        icon: 'System'
      });
    }
    if (!this.props.hideLinkUploadTab) {
      links.push({
        name: strings.FromLinkLinkLabel,
        url: addUrl ? '#link' : undefined,
        key: 'keyLink',
        icon: 'Link'
      });
    }

    let groups: INavLinkGroup[] = [{ links }];
    return groups;
  }

  private getDefaultSelectedTabKey = (props: IFilePickerProps, orgAssetsEnabled: boolean): string => {
    if (!props.hideRecentTab) {
      return 'keyRecent';
    }
    if (!props.hideStockImages) {
      return 'keyStockImages';
    }
    if (props.bingAPIKey && !props.hideWebSearchTab) {
      return 'keyWeb';
    }
    if (!props.hideOrganisationalAssetTab && orgAssetsEnabled) {
      return 'keyOrgAssets';
    }
    if (!props.hideOneDriveTab) {
      return 'keyOneDrive';
    }
    if (!props.hideSiteFilesTab) {
      return 'keySite';
    }
    if (!props.hideLocalUploadTab) {
      return 'keyUpload';
    }
    if (!props.hideLinkUploadTab) {
      return 'keyLink';
    }
  }

}
